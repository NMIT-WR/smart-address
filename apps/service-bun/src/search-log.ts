import type { AddressSuggestionResult } from "@smart-address/core";
import { Context, Effect, Layer } from "effect";
import { buildQueryLogFields } from "./log-fields";
import type { SuggestRequest } from "./request";
import {
  type AddressSqliteConfig,
  openAddressSqlite,
  sqliteSpanAttributes,
} from "./sqlite";

export interface AddressSearchLog {
  readonly record: (
    request: SuggestRequest,
    result: AddressSuggestionResult
  ) => Effect.Effect<void>;
}

export const AddressSearchLog =
  Context.GenericTag<AddressSearchLog>("AddressSearchLog");
export const AddressSearchLogSqlite = (config: AddressSqliteConfig = {}) =>
  Layer.effect(
    AddressSearchLog,
    Effect.sync(() => {
      const { db, path: dbPath } = openAddressSqlite(config);
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
            const { baseValues, cacheKey } = buildQueryLogFields(request);
            insert.run(
              ...baseValues,
              result.suggestions.length,
              result.errors.length,
              cacheKey,
              JSON.stringify(result)
            );
          }).pipe(
            Effect.withSpan("sqlite.write.search_log", {
              kind: "client",
              attributes: sqliteSpanAttributes("INSERT", dbPath),
            })
          ),
      };
    })
  );
