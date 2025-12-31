import { make as makeRpc } from "@effect/rpc/Rpc";
import { make as makeRpcGroup } from "@effect/rpc/RpcGroup";
import { AddressSuggestionResultSchema } from "@smart-address/core/schema";
import {
  Literal,
  NumberFromString,
  optional,
  type Schema,
  Number as SchemaNumber,
  String as SchemaString,
  Struct,
  Union,
} from "effect/Schema";

export const AddressStrategySchema = Union(
  Literal("fast"),
  Literal("reliable")
);
export type AddressStrategy = Schema.Type<typeof AddressStrategySchema>;

export const SuggestAddressPayloadSchema = Struct({
  text: optional(SchemaString).annotations({
    description: "User query text, e.g. '221B Baker Street'.",
  }),
  q: optional(SchemaString).annotations({
    description: "Alias for text. If both are provided, text wins.",
  }),
  limit: optional(Union(SchemaNumber, NumberFromString)).annotations({
    description: "Maximum number of suggestions to return.",
  }),
  countryCode: optional(SchemaString).annotations({
    description: "ISO-3166-1 alpha-2 country code (e.g. 'US', 'DE').",
  }),
  locale: optional(SchemaString).annotations({
    description: "BCP-47 locale tag (e.g. 'en-US').",
  }),
  sessionToken: optional(SchemaString).annotations({
    description: "Optional session token for result grouping.",
  }),
  strategy: optional(AddressStrategySchema).annotations({
    description: "Strategy hint: 'fast' or 'reliable'.",
  }),
  mode: optional(AddressStrategySchema).annotations({
    description: "Alias for strategy.",
  }),
});

export type SuggestAddressPayload = Schema.Type<
  typeof SuggestAddressPayloadSchema
>;

export const SuggestAddressErrorSchema = Struct({
  message: SchemaString,
});

export type SuggestAddressError = Schema.Type<typeof SuggestAddressErrorSchema>;

export const SuggestAddressRpc = makeRpc("suggest-address", {
  payload: SuggestAddressPayloadSchema,
  success: AddressSuggestionResultSchema,
  error: SuggestAddressErrorSchema,
});

export const SuggestAddressRpcGroup = makeRpcGroup(SuggestAddressRpc);
