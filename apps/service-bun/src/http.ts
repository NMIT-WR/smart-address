import { Effect } from "effect"
import { createHash, timingSafeEqual } from "node:crypto"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as UrlParams from "@effect/platform/UrlParams"
import type { AddressCachedSuggestorService } from "./cache"
import {
  decodeSuggestPayload,
  payloadFromSearchParams,
  toSuggestRequest,
  type SuggestRequestError
} from "./request"

export type SuggestAuthConfig = {
  readonly keys: ReadonlyArray<string>
}

export class SuggestAuth extends Effect.Service<SuggestAuth>()("@smart-address/service-bun/SuggestAuth", {
  effect: (config: SuggestAuthConfig) => Effect.succeed(config)
}) {}

const defaultAuthConfig: SuggestAuthConfig = { keys: [] }

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type"
}

const withCors = (response: HttpServerResponse.HttpServerResponse) =>
  HttpServerResponse.setHeaders(response, corsHeaders)

const jsonResponse = (body: unknown, status?: number) => {
  const options = status === undefined ? undefined : { status }
  return withCors(HttpServerResponse.unsafeJson(body, options))
}

const errorResponse = (message: string, status = 400) => jsonResponse({ error: message }, status)
const unauthorizedResponse = () => errorResponse("Missing or invalid key.", 401)

const isSuggestRequestError = (error: unknown): error is SuggestRequestError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error as { _tag?: string })._tag === "SuggestRequestError"

const readSearchParam = (
  params: Readonly<Record<string, string | ReadonlyArray<string> | undefined>>,
  key: string
): string | undefined => {
  const value = params[key]
  if (Array.isArray(value)) {
    return value[0]
  }
  return typeof value === "string" ? value : undefined
}

const hashKey = (value: string): Buffer => createHash("sha256").update(value).digest()

const timingSafeMatch = (left: string, right: string): boolean => timingSafeEqual(hashKey(left), hashKey(right))

const searchParamsFromRequest = (request: HttpServerRequest.HttpServerRequest) => {
  const url = new URL(request.url, "http://localhost")
  return HttpServerRequest.searchParamsFromURL(url)
}

const isAuthorized = (
  params: Readonly<Record<string, string | ReadonlyArray<string> | undefined>>,
  auth: SuggestAuthConfig
): boolean => {
  if (auth.keys.length === 0) {
    return true
  }
  const key = readSearchParam(params, "key")
  return typeof key === "string" && auth.keys.some((candidate) => timingSafeMatch(candidate, key))
}

const parseSuggestPayload = (payload: unknown) =>
  decodeSuggestPayload(payload).pipe(Effect.flatMap(toSuggestRequest))

const handleSuggestPayload = (suggestor: AddressCachedSuggestorService, payload: unknown) =>
  parseSuggestPayload(payload).pipe(
    Effect.flatMap((request) => suggestor.suggest(request)),
    Effect.map((result) => jsonResponse(result)),
    Effect.catchAll((error) =>
      Effect.succeed(isSuggestRequestError(error) ? errorResponse(error.message) : errorResponse("Invalid request"))
    )
  )

export const handleSuggestGet =
  (suggestor: AddressCachedSuggestorService, auth: SuggestAuthConfig = defaultAuthConfig) =>
  (request: HttpServerRequest.HttpServerRequest) => {
    const params = searchParamsFromRequest(request)
    if (!isAuthorized(params, auth)) {
      return Effect.succeed(unauthorizedResponse())
    }
    const payload = payloadFromSearchParams(params)
    return handleSuggestPayload(suggestor, payload)
  }

const parseFormBody = (request: HttpServerRequest.HttpServerRequest) =>
  request.urlParamsBody.pipe(
    Effect.map(UrlParams.toRecord),
    Effect.map(payloadFromSearchParams)
  )

export const handleSuggestPost =
  (suggestor: AddressCachedSuggestorService, auth: SuggestAuthConfig = defaultAuthConfig) =>
  (request: HttpServerRequest.HttpServerRequest) => {
    const params = searchParamsFromRequest(request)
    if (!isAuthorized(params, auth)) {
      return Effect.succeed(unauthorizedResponse())
    }
    const contentType = request.headers["content-type"] ?? ""
    const bodyEffect =
      contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")
        ? parseFormBody(request)
        : request.json

    return bodyEffect.pipe(
      Effect.flatMap((payload) => handleSuggestPayload(suggestor, payload)),
      Effect.catchAll(() => Effect.succeed(errorResponse("Invalid request")))
    )
  }

export const optionsResponse = withCors(HttpServerResponse.text("", { status: 204 }))
