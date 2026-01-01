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
  extend,
  NumberFromString,
  partial,
  type Schema,
  Number as SchemaNumber,
  String as SchemaString,
  Struct,
  Union,
} from "effect/Schema";

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

export const AcceptAddressPayloadSchema = Struct({
  suggestion: AddressSuggestionSchema,
}).pipe(extend(AcceptAddressOptionalSchema));

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
