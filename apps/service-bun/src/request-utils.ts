import { type AddressQuery, normalizeAddressQuery } from "@smart-address/core";
import type { AddressStrategy } from "@smart-address/rpc/suggest";

interface QueryPayload {
  readonly text?: string | undefined;
  readonly q?: string | undefined;
  readonly limit?: number | undefined;
  readonly countryCode?: string | undefined;
  readonly locale?: string | undefined;
  readonly sessionToken?: string | undefined;
  readonly strategy?: AddressStrategy | undefined;
  readonly mode?: AddressStrategy | undefined;
}

interface ParsedQueryPayload {
  readonly query: AddressQuery;
  readonly strategy: AddressStrategy;
}

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
