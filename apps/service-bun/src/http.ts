import { Effect } from "effect"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as UrlParams from "@effect/platform/UrlParams"
import { AddressCachedSuggestor } from "./cache"
import {
  decodeSuggestPayload,
  payloadFromSearchParams,
  toSuggestRequest,
  type SuggestRequestError
} from "./request"

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type"
}

const withCors = (response: HttpServerResponse.HttpServerResponse) =>
  HttpServerResponse.setHeaders(response, corsHeaders)

const withCorsEffect = <E, R>(
  response: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
) => response.pipe(Effect.map(withCors))

const errorResponse = (message: string, status = 400) =>
  withCorsEffect(HttpServerResponse.json({ error: message }, { status }))

const isSuggestRequestError = (error: unknown): error is SuggestRequestError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error as { _tag?: string })._tag === "SuggestRequestError"

const parseSuggestPayload = (payload: unknown) =>
  decodeSuggestPayload(payload).pipe(Effect.flatMap(toSuggestRequest))

const handleSuggestPayload = (payload: unknown) =>
  Effect.flatMap(AddressCachedSuggestor, (suggestor) =>
    parseSuggestPayload(payload).pipe(
      Effect.flatMap((request) => suggestor.suggest(request)),
      Effect.flatMap((result) => withCorsEffect(HttpServerResponse.json(result))),
      Effect.catchAll((error) => {
        if (isSuggestRequestError(error)) {
          return errorResponse(error.message)
        }
        return errorResponse("Invalid request")
      })
    )
  )

export const handleSuggestGet = (request: HttpServerRequest.HttpServerRequest) => {
  const url = new URL(request.url, "http://localhost")
  const params = HttpServerRequest.searchParamsFromURL(url)
  const payload = payloadFromSearchParams(params)
  return handleSuggestPayload(payload)
}

const parseFormBody = (request: HttpServerRequest.HttpServerRequest) =>
  request.urlParamsBody.pipe(
    Effect.map(UrlParams.toRecord),
    Effect.map(payloadFromSearchParams)
  )

export const handleSuggestPost = (request: HttpServerRequest.HttpServerRequest) => {
  const contentType = request.headers["content-type"] ?? ""
  const bodyEffect =
    contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")
      ? parseFormBody(request)
      : request.json

  return bodyEffect.pipe(
    Effect.flatMap(handleSuggestPayload),
    Effect.catchAll(() => Effect.succeed(errorResponse("Invalid request")))
  )
}

export const optionsResponse = withCors(HttpServerResponse.text("", { status: 204 }))
