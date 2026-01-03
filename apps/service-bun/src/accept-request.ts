import type { AddressQuery, AddressSuggestion } from "@smart-address/core";
import { AddressSuggestionSchema } from "@smart-address/core/schema";
import {
  type AddressStrategy,
  AddressStrategySchema,
} from "@smart-address/rpc/suggest";
import { Data, Effect } from "effect";
import {
  decodeUnknown,
  extend,
  NumberFromString,
  partial,
  type Schema,
  Number as SchemaNumber,
  String as SchemaString,
  Struct,
  Union,
} from "effect/Schema";
import { parseQueryPayload } from "./request-utils";

const AcceptAddressOptionalSchema = partial(
  Struct({
    text: SchemaString,
    q: SchemaString,
    limit: Union(SchemaNumber, NumberFromString),
    countryCode: SchemaString,
    locale: SchemaString,
    sessionToken: SchemaString,
    strategy: AddressStrategySchema,
    mode: AddressStrategySchema,
    resultIndex: Union(SchemaNumber, NumberFromString),
    resultCount: Union(SchemaNumber, NumberFromString),
  })
);

const AcceptAddressPayloadSchema = Struct({
  suggestion: AddressSuggestionSchema,
}).pipe(extend(AcceptAddressOptionalSchema));

type AcceptAddressPayload = Schema.Type<typeof AcceptAddressPayloadSchema>;

export interface AcceptRequest {
  readonly query: AddressQuery;
  readonly strategy: AddressStrategy;
  readonly suggestion: AddressSuggestion;
  readonly resultIndex?: number;
  readonly resultCount?: number;
}

class AcceptRequestError extends Data.TaggedError("AcceptRequestError")<{
  readonly message: string;
}> {}

const normalizeCount = (value: number | undefined): number | undefined => {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.trunc(value);
  return normalized < 0 ? undefined : normalized;
};

export const decodeAcceptPayload = (payload: unknown) =>
  decodeUnknown(AcceptAddressPayloadSchema)(payload);

export const toAcceptRequest = (
  payload: AcceptAddressPayload
): Effect.Effect<AcceptRequest, AcceptRequestError> => {
  const parsed = parseQueryPayload(payload);
  if ("error" in parsed) {
    return Effect.fail(new AcceptRequestError({ message: parsed.error }));
  }

  return Effect.succeed({
    query: parsed.query,
    strategy: parsed.strategy,
    suggestion: payload.suggestion,
    resultIndex: normalizeCount(payload.resultIndex),
    resultCount: normalizeCount(payload.resultCount),
  });
};
