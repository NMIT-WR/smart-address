import * as Schema from "effect/Schema"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import { AddressSuggestionResultSchema } from "@smart-address/core/schema"

export const AddressStrategySchema = Schema.Union(Schema.Literal("fast"), Schema.Literal("reliable"))
export type AddressStrategy = Schema.Schema.Type<typeof AddressStrategySchema>

export const SuggestAddressPayloadSchema = Schema.Struct({
  text: Schema.optional(Schema.String).annotations({
    description: "User query text, e.g. '221B Baker Street'."
  }),
  q: Schema.optional(Schema.String).annotations({
    description: "Alias for text. If both are provided, text wins."
  }),
  limit: Schema.optional(Schema.Union(Schema.Number, Schema.NumberFromString)).annotations({
    description: "Maximum number of suggestions to return."
  }),
  countryCode: Schema.optional(Schema.String).annotations({
    description: "ISO-3166-1 alpha-2 country code (e.g. 'US', 'DE')."
  }),
  locale: Schema.optional(Schema.String).annotations({
    description: "BCP-47 locale tag (e.g. 'en-US')."
  }),
  sessionToken: Schema.optional(Schema.String).annotations({
    description: "Optional session token for result grouping."
  }),
  strategy: Schema.optional(AddressStrategySchema).annotations({
    description: "Strategy hint: 'fast' or 'reliable'."
  }),
  mode: Schema.optional(AddressStrategySchema).annotations({
    description: "Alias for strategy."
  })
})

export type SuggestAddressPayload = Schema.Schema.Type<typeof SuggestAddressPayloadSchema>

export const SuggestAddressErrorSchema = Schema.Struct({
  message: Schema.String
})

export type SuggestAddressError = Schema.Schema.Type<typeof SuggestAddressErrorSchema>

export const SuggestAddressRpc = Rpc.make("suggest-address", {
  payload: SuggestAddressPayloadSchema,
  success: AddressSuggestionResultSchema,
  error: SuggestAddressErrorSchema
})

export const SuggestAddressRpcGroup = RpcGroup.make(SuggestAddressRpc)
