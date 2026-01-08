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
import { Cause, Effect, Exit } from "effect";
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
  makeRequestEvent,
  makeRequestId,
  RequestEvent,
  type RequestEventKind,
  serverTimingHeader,
} from "./request-event";
import {
  recordAcceptFromContext,
  recordSuggestFromContext,
} from "./request-event-context";

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
  const accept = request.headers["accept"];
  if (typeof accept !== "string") {
    return false;
  }
  const value = accept.toLowerCase();
  return (
    value.includes("text/plain") ||
    value.includes("application/openmetrics-text")
  );
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
      const headerRequestId = request.headers["x-request-id"] ?? "";
      const requestId =
        typeof headerRequestId === "string" && headerRequestId.trim().length > 0
          ? headerRequestId
          : makeRequestId();
      const requestEvent = yield* makeRequestEvent({
        requestId,
        kind: init.kind,
        source: "http",
        method: request.method,
        path,
      });

      if (init.markImportant) {
        yield* requestEvent.markImportant();
      }

      yield* Effect.annotateCurrentSpan({ "request.id": requestId });

      const responseExit = yield* handler(request).pipe(
        Effect.provideService(RequestEvent, requestEvent),
        Effect.annotateSpans({
          "request.id": requestId,
          "request.kind": init.kind,
          "request.source": "http",
        }),
        Effect.exit
      );

      if (Exit.isSuccess(responseExit)) {
        const response = responseExit.value;
        const finalized = yield* requestEvent.flush(response.status);
        return withRequestId(
          withServerTiming(response, serverTimingHeader(finalized)),
          requestId
        );
      }

      const errorMessage = Cause.pretty(responseExit.cause);
      yield* requestEvent
        .recordError(errorMessage)
        .pipe(Effect.catchAll(() => Effect.void));

      const response = errorResponse("Internal error", 500);
      const finalized = yield* requestEvent.flush(response.status);
      return withRequestId(
        withServerTiming(response, serverTimingHeader(finalized)),
        requestId
      );
    }).pipe(
      Effect.withSpan(spanName, {
        kind: "server",
        attributes: {
          "http.method": request.method,
          "http.route": path,
          "request.kind": init.kind,
          "request.source": "http",
        },
      })
    );
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
