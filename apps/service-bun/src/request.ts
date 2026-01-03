import type { AddressQuery } from "@smart-address/core";
import {
  type AddressStrategy,
  type SuggestAddressPayload,
  SuggestAddressPayloadSchema,
} from "@smart-address/rpc/suggest";
import { Data, Effect } from "effect";
import { decodeUnknown } from "effect/Schema";
import { parseQueryPayload } from "./request-utils";

export interface SuggestRequest {
  readonly query: AddressQuery;
  readonly strategy: AddressStrategy;
}

class SuggestRequestError extends Data.TaggedError("SuggestRequestError")<{
  readonly message: string;
}> {}

export const decodeSuggestPayload = (payload: unknown) =>
  decodeUnknown(SuggestAddressPayloadSchema)(payload);

export const payloadFromSearchParams = (
  params: Readonly<Record<string, string | readonly string[] | undefined>>
): SuggestAddressPayload => {
  const readParam = (key: string): string | undefined => {
    const value = params[key];
    if (Array.isArray(value)) {
      return value[0];
    }
    return typeof value === "string" ? value : undefined;
  };

  const parseNumberParam = (value: string | undefined): number | undefined => {
    if (!value) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const parseStrategyParam = (
    value: string | undefined
  ): AddressStrategy | undefined =>
    value === "fast" || value === "reliable" ? value : undefined;

  return {
    text: readParam("text"),
    q: readParam("q"),
    limit: parseNumberParam(readParam("limit")),
    countryCode: readParam("countryCode"),
    locale: readParam("locale"),
    sessionToken: readParam("sessionToken"),
    strategy: parseStrategyParam(readParam("strategy")),
    mode: parseStrategyParam(readParam("mode")),
  };
};

export const toSuggestRequest = (
  payload: SuggestAddressPayload
): Effect.Effect<SuggestRequest, SuggestRequestError> => {
  const parsed = parseQueryPayload(payload);
  if ("error" in parsed) {
    return Effect.fail(new SuggestRequestError({ message: parsed.error }));
  }

  return Effect.succeed(parsed);
};
