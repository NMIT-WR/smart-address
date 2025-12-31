import {
  type AddressSuggestionResult,
  addressQueryKey,
  normalizeAddressQuery,
} from "@smart-address/core";
import { Context, Effect, Layer } from "effect";
import type { SuggestRequest } from "./request";
import { type AddressSqliteConfig, openAddressSqlite } from "./sqlite";

export interface AddressSearchLog {
  readonly record: (
    request: SuggestRequest,
    result: AddressSuggestionResult
  ) => Effect.Effect<void>;
}

export const AddressSearchLog =
  Context.GenericTag<AddressSearchLog>("AddressSearchLog");

export const AddressSearchLogNone = Layer.succeed(AddressSearchLog, {
  record: () => Effect.void,
});

export const AddressSearchLogSqlite = (config: AddressSqliteConfig = {}) =>
  Layer.effect(
    AddressSearchLog,
    Effect.sync(() => {
      const { db } = openAddressSqlite(config);
      const insert = db.prepare(`
        INSERT INTO address_search_log (
          created_at,
          query_text,
          query_normalized,
          strategy,
          limit_value,
          country_code,
          locale,
          session_token,
          result_count,
          error_count,
          cache_key,
          result_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      return {
        record: (request, result) =>
          Effect.sync(() => {
            const normalized = normalizeAddressQuery(request.query);
            insert.run(
              Date.now(),
              request.query.text,
              normalized.text,
              request.strategy,
              normalized.limit ?? null,
              normalized.countryCode ?? null,
              normalized.locale ?? null,
              normalized.sessionToken ?? null,
              result.suggestions.length,
              result.errors.length,
              `${request.strategy}:${addressQueryKey(normalized)}`,
              JSON.stringify(result)
            );
          }),
      };
    })
  );
