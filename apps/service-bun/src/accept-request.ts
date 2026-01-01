import {
  type AddressQuery,
  type AddressSuggestion,
  normalizeAddressQuery,
} from "@smart-address/core";
import { AddressSuggestionSchema } from "@smart-address/core/schema";
import {
  type AddressStrategy,
  AddressStrategySchema,
} from "@smart-address/rpc/suggest";
import { Data, Effect } from "effect";
import {
  decodeUnknown,
  NumberFromString,
  optional,
  type Schema,
  Number as SchemaNumber,
  String as SchemaString,
  Struct,
  Union,
} from "effect/Schema";

export const AcceptAddressPayloadSchema = Struct({
  text: optional(SchemaString),
  q: optional(SchemaString),
  limit: optional(Union(SchemaNumber, NumberFromString)),
  countryCode: optional(SchemaString),
  locale: optional(SchemaString),
  sessionToken: optional(SchemaString),
  strategy: optional(AddressStrategySchema),
  mode: optional(AddressStrategySchema),
  suggestion: AddressSuggestionSchema,
  resultIndex: optional(Union(SchemaNumber, NumberFromString)),
  resultCount: optional(Union(SchemaNumber, NumberFromString)),
});

export type AcceptAddressPayload = Schema.Type<
  typeof AcceptAddressPayloadSchema
>;

export interface AcceptRequest {
  readonly query: AddressQuery;
  readonly strategy: AddressStrategy;
  readonly suggestion: AddressSuggestion;
  readonly resultIndex?: number;
  readonly resultCount?: number;
}

export class AcceptRequestError extends Data.TaggedError("AcceptRequestError")<{
  readonly message: string;
}> {}

const normalizeCount = (value: number | undefined): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : undefined;
};

export const decodeAcceptPayload = (payload: unknown) =>
  decodeUnknown(AcceptAddressPayloadSchema)(payload);

export const toAcceptRequest = (
  payload: AcceptAddressPayload
): Effect.Effect<AcceptRequest, AcceptRequestError> => {
  const text = payload.text ?? payload.q;
  if (!text || text.trim().length === 0) {
    return Effect.fail(
      new AcceptRequestError({
        message: "Missing required 'text' or 'q' field.",
      })
    );
  }

  const query = normalizeAddressQuery({
    text,
    limit: payload.limit,
    countryCode: payload.countryCode,
    locale: payload.locale,
    sessionToken: payload.sessionToken,
  });
  const strategy = payload.strategy ?? payload.mode ?? "reliable";

  return Effect.succeed({
    query,
    strategy,
    suggestion: payload.suggestion,
    resultIndex: normalizeCount(payload.resultIndex),
    resultCount: normalizeCount(payload.resultCount),
  });
};
