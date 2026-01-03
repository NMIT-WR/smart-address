import { type AddressQuery, normalizeAddressQuery } from "@smart-address/core";
import type { AddressStrategy } from "@smart-address/rpc/suggest";

type QueryPayload = {
  readonly text?: string;
  readonly q?: string;
  readonly limit?: number;
  readonly countryCode?: string;
  readonly locale?: string;
  readonly sessionToken?: string;
  readonly strategy?: AddressStrategy;
  readonly mode?: AddressStrategy;
};

type ParsedQueryPayload = {
  readonly query: AddressQuery;
  readonly strategy: AddressStrategy;
};

export const parseQueryPayload = (
  payload: QueryPayload
): ParsedQueryPayload | { error: string } => {
  const text = payload.text ?? payload.q;
  if (!text || text.trim().length === 0) {
    return { error: "Missing required 'text' or 'q' field." };
  }

  return {
    query: normalizeAddressQuery({
      text,
      limit: payload.limit,
      countryCode: payload.countryCode,
      locale: payload.locale,
      sessionToken: payload.sessionToken,
    }),
    strategy: payload.strategy ?? payload.mode ?? "reliable",
  };
};
