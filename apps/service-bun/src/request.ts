import { Data, Effect } from "effect"
import * as Schema from "effect/Schema"
import { normalizeAddressQuery, type AddressQuery } from "@smart-address/core"
import {
  SuggestAddressPayloadSchema,
  type AddressStrategy,
  type SuggestAddressPayload
} from "@smart-address/rpc/suggest"

export type SuggestRequest = {
  readonly query: AddressQuery
  readonly strategy: AddressStrategy
}

export class SuggestRequestError extends Data.TaggedError("SuggestRequestError")<{
  readonly message: string
}> {}

export const decodeSuggestPayload = (payload: unknown) =>
  Schema.decodeUnknown(SuggestAddressPayloadSchema)(payload)

export const payloadFromSearchParams = (
  params: Readonly<Record<string, string | ReadonlyArray<string> | undefined>>
): SuggestAddressPayload => {
  const readParam = (key: string): string | undefined => {
    const value = params[key]
    if (Array.isArray(value)) {
      return value[0]
    }
    return typeof value === "string" ? value : undefined
  }

  const parseNumberParam = (value: string | undefined): number | undefined => {
    if (!value) {
      return undefined
    }
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const parseStrategyParam = (value: string | undefined): AddressStrategy | undefined =>
    value === "fast" || value === "reliable" ? value : undefined

  return {
    text: readParam("text"),
    q: readParam("q"),
    limit: parseNumberParam(readParam("limit")),
    countryCode: readParam("countryCode"),
    locale: readParam("locale"),
    sessionToken: readParam("sessionToken"),
    strategy: parseStrategyParam(readParam("strategy")),
    mode: parseStrategyParam(readParam("mode"))
  }
}

export const toSuggestRequest = (
  payload: SuggestAddressPayload
): Effect.Effect<SuggestRequest, SuggestRequestError> => {
  const text = payload.text ?? payload.q
  if (!text || text.trim().length === 0) {
    return Effect.fail(
      new SuggestRequestError({
        message: "Missing required 'text' or 'q' field."
      })
    )
  }

  const query = normalizeAddressQuery({
    text,
    limit: payload.limit,
    countryCode: payload.countryCode,
    locale: payload.locale,
    sessionToken: payload.sessionToken
  })
  const strategy = payload.strategy ?? payload.mode ?? "reliable"

  return Effect.succeed({
    query,
    strategy
  })
}
