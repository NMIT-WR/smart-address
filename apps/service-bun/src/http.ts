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
import type { AddressCachedSuggestor } from "./cache";
import {
  decodeAcceptPayload,
  type AcceptRequestError,
  toAcceptRequest,
} from "./accept-request";
import {
  decodeSuggestPayload,
  payloadFromSearchParams,
  type SuggestRequestError,
  toSuggestRequest,
} from "./request";

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

const isSuggestRequestError = (error: unknown): error is SuggestRequestError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error as { _tag?: string })._tag === "SuggestRequestError";

const isAcceptRequestError = (error: unknown): error is AcceptRequestError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error as { _tag?: string })._tag === "AcceptRequestError";

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
    Effect.catchAll((error) =>
      Effect.succeed(
        isSuggestRequestError(error)
          ? errorResponse(error.message)
          : errorResponse("Invalid request")
      )
    )
  );

const handleAcceptPayload = (log: AddressAcceptLog, payload: unknown) =>
  parseAcceptPayload(payload).pipe(
    Effect.flatMap((request) => log.record(request)),
    Effect.as(jsonResponse({ ok: true })),
    Effect.catchAll((error) =>
      Effect.succeed(
        isAcceptRequestError(error)
          ? errorResponse(error.message)
          : errorResponse("Invalid request")
      )
    )
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

export const optionsResponse = withCors(text("", { status: 204 }));
