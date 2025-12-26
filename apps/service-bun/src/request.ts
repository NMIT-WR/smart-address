import { Data, Effect } from "effect"
import * as Schema from "effect/Schema"
import { normalizeAddressQuery, type AddressQuery } from "@smart-address/core"
import {
  AddressStrategy,
  SuggestAddressPayloadSchema,
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
    return value
  }

  return {
    text: readParam("text"),
    q: readParam("q"),
    limit: readParam("limit"),
    countryCode: readParam("countryCode"),
    locale: readParam("locale"),
    sessionToken: readParam("sessionToken"),
    strategy: readParam("strategy"),
    mode: readParam("mode")
  }
}

export const toSuggestRequest = (payload: SuggestAddressPayload) => {
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
