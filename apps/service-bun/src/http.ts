import { withSpanContext } from "@effect/opentelemetry/Tracer";
import {
  type HttpServerRequest,
  searchParamsFromURL,
} from "@effect/platform/HttpServerRequest";
import {
  type HttpServerResponse,
  setHeaders,
  text,
  unsafeJson,
} from "@effect/platform/HttpServerResponse";
import { toRecord } from "@effect/platform/UrlParams";
import type { SpanContext } from "@opentelemetry/api";
import { Effect, Ref } from "effect";
import type { AddressAcceptLog } from "./accept-log";
import { decodeAcceptPayload, toAcceptRequest } from "./accept-request";
import type { AddressCachedSuggestor } from "./cache";
import { type AddressMetrics, renderPrometheusMetrics } from "./metrics";
import {
  decodeSuggestPayload,
  payloadFromSearchParams,
  toSuggestRequest,
} from "./request";
import {
  type FinalizedRequestEvent,
  makeRequestId,
  RequestEvent,
  type RequestEventKind,
  serverTimingHeader,
} from "./request-event";
import {
  recordAcceptFromContext,
  recordSuggestFromContext,
} from "./request-event-context";
import { runRequestEvent } from "./request-event-runner";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

const withCors = (response: HttpServerResponse) =>
  setHeaders(response, corsHeaders);

const withRequestId = (response: HttpServerResponse, requestId: string) =>
  setHeaders(response, { "x-request-id": requestId });

const withServerTiming = (
  response: HttpServerResponse,
  headerValue: string | undefined
) =>
  headerValue
    ? setHeaders(response, { "server-timing": headerValue })
    : response;

const jsonResponse = (body: unknown, status?: number) => {
  const options = status === undefined ? undefined : { status };
  return withCors(unsafeJson(body, options));
};

const errorResponse = (message: string, status = 400) =>
  jsonResponse({ error: message }, status);

const acceptsPrometheus = (request: HttpServerRequest): boolean => {
  const accept = request.headers.accept;
  let value: string | undefined;
  if (Array.isArray(accept)) {
    value = accept.join(",");
  } else if (typeof accept === "string") {
    value = accept;
  }
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return (
    normalized.includes("text/plain") ||
    normalized.includes("application/openmetrics-text")
  );
};

const readHeaderValue = (
  value: string | readonly string[] | undefined
): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
};

const traceparentPattern =
  /^[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;
const traceIdZeroPattern = /^0{32}$/;
const spanIdZeroPattern = /^0{16}$/;

const parseTraceparent = (value: string): SpanContext | undefined => {
  const trimmed = value.trim().toLowerCase();
  if (!traceparentPattern.test(trimmed)) {
    return undefined;
  }
  const [version, traceId, spanId, flags] = trimmed.split("-");
  if (version === "ff") {
    return undefined;
  }
  if (version.length !== 2) {
    return undefined;
  }
  if (traceIdZeroPattern.test(traceId) || spanIdZeroPattern.test(spanId)) {
    return undefined;
  }
  const traceFlags = Number.parseInt(flags, 16);
  return {
    traceId,
    spanId,
    traceFlags: traceFlags as SpanContext["traceFlags"],
    isRemote: true,
  };
};

interface HttpRequestEventInit {
  readonly kind: RequestEventKind;
  readonly markImportant?: boolean;
}

export const withHttpRequestEvent =
  <R, E>(
    init: HttpRequestEventInit,
    handler: (
      request: HttpServerRequest
    ) => Effect.Effect<HttpServerResponse, E, R>
  ) =>
  (request: HttpServerRequest) => {
    const url = new URL(request.url, "http://localhost");
    const path = url.pathname;
    const spanName = `${request.method} ${path}`;

    return Effect.gen(function* () {
      const headerRequestId = readHeaderValue(request.headers["x-request-id"]);
      const requestId =
        headerRequestId && headerRequestId.trim().length > 0
          ? headerRequestId
          : makeRequestId();
      const traceparent = readHeaderValue(request.headers.traceparent);
      const spanContext = traceparent
        ? parseTraceparent(traceparent)
        : undefined;
      const finalizedRef = yield* Ref.make<FinalizedRequestEvent | undefined>(
        undefined
      );

      const effect = Effect.gen(function* () {
        if (init.markImportant) {
          const requestEvent = yield* RequestEvent;
          yield* requestEvent.markImportant();
        }
        return yield* handler(request);
      });

      const runEffect = runRequestEvent(
        {
          requestId,
          kind: init.kind,
          source: "http",
          method: request.method,
          path,
          spanName,
          spanAttributes: {
            "http.method": request.method,
            "http.route": path,
            "request.kind": init.kind,
            "request.source": "http",
          },
        },
        effect,
        {
          statusCode: (response) => response.status,
          onFinalized: (finalized) => Ref.set(finalizedRef, finalized),
        }
      );

      const tracedEffect = spanContext
        ? withSpanContext(runEffect, spanContext)
        : runEffect;

      const response = yield* tracedEffect.pipe(
        Effect.catchAllCause(() =>
          Effect.succeed(errorResponse("Internal error", 500))
        )
      );

      const finalized = yield* Ref.get(finalizedRef);
      return withRequestId(
        withServerTiming(response, serverTimingHeader(finalized)),
        requestId
      );
    });
  };

const parseSuggestPayload = (payload: unknown) =>
  decodeSuggestPayload(payload).pipe(Effect.flatMap(toSuggestRequest));

const parseAcceptPayload = (payload: unknown) =>
  decodeAcceptPayload(payload).pipe(Effect.flatMap(toAcceptRequest));

const handleSuggestPayload = (
  suggestor: AddressCachedSuggestor,
  payload: unknown
) =>
  parseSuggestPayload(payload).pipe(
    Effect.tap((request) => recordSuggestFromContext(request)),
    Effect.flatMap((request) => suggestor.suggest(request)),
    Effect.map((result) => jsonResponse(result)),
    Effect.catchTag("SuggestRequestError", (error) =>
      Effect.succeed(errorResponse(error.message))
    ),
    Effect.catchAll(() => Effect.succeed(errorResponse("Invalid request")))
  );

const handleAcceptPayload = (log: AddressAcceptLog, payload: unknown) =>
  parseAcceptPayload(payload).pipe(
    Effect.tap((request) => recordAcceptFromContext(request)),
    Effect.flatMap((request) => log.record(request)),
    Effect.as(jsonResponse({ ok: true })),
    Effect.catchTag("AcceptRequestError", (error) =>
      Effect.succeed(errorResponse(error.message))
    ),
    Effect.catchAll(() => Effect.succeed(errorResponse("Invalid request")))
  );

export const handleSuggestGet = (suggestor: AddressCachedSuggestor) =>
  withHttpRequestEvent({ kind: "suggest" }, (request) => {
    const url = new URL(request.url, "http://localhost");
    const params = searchParamsFromURL(url);
    const payload = payloadFromSearchParams(params);
    return handleSuggestPayload(suggestor, payload);
  });

const parseFormBody = (request: HttpServerRequest) =>
  request.urlParamsBody.pipe(
    Effect.map(toRecord),
    Effect.map(payloadFromSearchParams)
  );

export const handleSuggestPost = (suggestor: AddressCachedSuggestor) =>
  withHttpRequestEvent({ kind: "suggest" }, (request) => {
    const contentType = request.headers["content-type"] ?? "";
    const bodyEffect =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
        ? parseFormBody(request)
        : request.json;

    return bodyEffect.pipe(
      Effect.flatMap((payload) => handleSuggestPayload(suggestor, payload)),
      Effect.catchAll(() => Effect.succeed(errorResponse("Invalid request")))
    );
  });

export const handleAcceptPost = (log: AddressAcceptLog) =>
  withHttpRequestEvent({ kind: "accept", markImportant: true }, (request) =>
    request.json.pipe(
      Effect.flatMap((payload) => handleAcceptPayload(log, payload)),
      Effect.catchAll(() => Effect.succeed(errorResponse("Invalid request")))
    )
  );

export const handleMetricsGet = (metrics: AddressMetrics) =>
  withHttpRequestEvent({ kind: "metrics" }, (request) =>
    metrics.snapshot.pipe(
      Effect.map((snapshot) => {
        if (!acceptsPrometheus(request)) {
          return jsonResponse(snapshot);
        }
        const body = renderPrometheusMetrics(snapshot);
        return withCors(
          setHeaders(text(body), {
            "content-type": "text/plain; version=0.0.4",
          })
        );
      })
    )
  );

export const handleOptions = withHttpRequestEvent({ kind: "options" }, () =>
  Effect.succeed(withCors(text("", { status: 204 })))
);
