import {
  type AddressQuery,
  addressQueryKey,
  normalizeAddressQuery,
} from "@smart-address/core";

interface QueryLogRequest {
  readonly query: AddressQuery;
  readonly strategy: string;
}

export const buildQueryLogFields = (request: QueryLogRequest) => {
  const normalized = normalizeAddressQuery(request.query);
  const cacheKey = `${request.strategy}:${addressQueryKey(normalized)}`;

  return {
    normalized,
    cacheKey,
    baseValues: [
      Date.now(),
      request.query.text,
      normalized.text,
      request.strategy,
      normalized.limit ?? null,
      normalized.countryCode ?? null,
      normalized.locale ?? null,
      normalized.sessionToken ?? null,
    ] as const,
  };
};
