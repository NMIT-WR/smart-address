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
import { Effect } from "effect";
import type { AddressAcceptLog } from "./accept-log";
import { decodeAcceptPayload, toAcceptRequest } from "./accept-request";
import type { AddressCachedSuggestor } from "./cache";
import {
  decodeSuggestPayload,
  payloadFromSearchParams,
  toSuggestRequest,
} from "./request";
import type { AddressMetrics } from "./metrics";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

const withCors = (response: HttpServerResponse) =>
  setHeaders(response, corsHeaders);

const jsonResponse = (body: unknown, status?: number) => {
  const options = status === undefined ? undefined : { status };
  return withCors(unsafeJson(body, options));
};

const errorResponse = (message: string, status = 400) =>
  jsonResponse({ error: message }, status);

const parseSuggestPayload = (payload: unknown) =>
  decodeSuggestPayload(payload).pipe(Effect.flatMap(toSuggestRequest));

const parseAcceptPayload = (payload: unknown) =>
  decodeAcceptPayload(payload).pipe(Effect.flatMap(toAcceptRequest));

const handleSuggestPayload = (
  suggestor: AddressCachedSuggestor,
  payload: unknown
) =>
  parseSuggestPayload(payload).pipe(
    Effect.flatMap((request) => suggestor.suggest(request)),
    Effect.map((result) => jsonResponse(result)),
    Effect.catchTag("SuggestRequestError", (error) =>
      Effect.succeed(errorResponse(error.message))
    ),
    Effect.catchAll(() => Effect.succeed(errorResponse("Invalid request")))
  );

const handleAcceptPayload = (log: AddressAcceptLog, payload: unknown) =>
  parseAcceptPayload(payload).pipe(
    Effect.flatMap((request) => log.record(request)),
    Effect.as(jsonResponse({ ok: true })),
    Effect.catchTag("AcceptRequestError", (error) =>
      Effect.succeed(errorResponse(error.message))
    ),
    Effect.catchAll(() => Effect.succeed(errorResponse("Invalid request")))
  );

export const handleSuggestGet =
  (suggestor: AddressCachedSuggestor) => (request: HttpServerRequest) => {
    const url = new URL(request.url, "http://localhost");
    const params = searchParamsFromURL(url);
    const payload = payloadFromSearchParams(params);
    return handleSuggestPayload(suggestor, payload);
  };

const parseFormBody = (request: HttpServerRequest) =>
  request.urlParamsBody.pipe(
    Effect.map(toRecord),
    Effect.map(payloadFromSearchParams)
  );

export const handleSuggestPost =
  (suggestor: AddressCachedSuggestor) => (request: HttpServerRequest) => {
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
  };

export const handleAcceptPost =
  (log: AddressAcceptLog) => (request: HttpServerRequest) =>
    request.json.pipe(
      Effect.flatMap((payload) => handleAcceptPayload(log, payload)),
      Effect.catchAll(() => Effect.succeed(errorResponse("Invalid request")))
    );

export const handleMetricsGet = (metrics: AddressMetrics) => () =>
  metrics.snapshot.pipe(Effect.map((snapshot) => jsonResponse(snapshot)));

export const optionsResponse = withCors(text("", { status: 204 }));
