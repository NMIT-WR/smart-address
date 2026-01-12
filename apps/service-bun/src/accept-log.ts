import { Context, Effect, Layer } from "effect";
import type { AcceptRequest } from "./accept-request";
import { buildQueryLogFields } from "./log-fields";
import {
  type AddressSqliteConfig,
  openAddressSqlite,
  sqliteSpanAttributes,
} from "./sqlite";

export interface AddressAcceptLog {
  readonly record: (request: AcceptRequest) => Effect.Effect<void>;
}

export const AddressAcceptLog =
  Context.GenericTag<AddressAcceptLog>("AddressAcceptLog");

export const AddressAcceptLogSqlite = (config: AddressSqliteConfig = {}) =>
  Layer.effect(
    AddressAcceptLog,
    Effect.try(() => {
      const { db, path: dbPath } = openAddressSqlite(config);
      const insert = db.prepare(`
        INSERT INTO address_accept_log (
          created_at,
          query_text,
          query_normalized,
          strategy,
          limit_value,
          country_code,
          locale,
          session_token,
          cache_key,
          suggestion_id,
          suggestion_label,
          suggestion_source_provider,
          suggestion_source_kind,
          suggestion_source_reference,
          result_index,
          result_count,
          suggestion_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      return {
        record: (request) =>
          Effect.sync(() => {
            const { baseValues, cacheKey } = buildQueryLogFields(request);
            const suggestion = request.suggestion;
            insert.run(
              ...baseValues,
              cacheKey,
              suggestion.id,
              suggestion.label,
              suggestion.source.provider,
              suggestion.source.kind ?? null,
              suggestion.source.reference ?? null,
              request.resultIndex ?? null,
              request.resultCount ?? null,
              JSON.stringify(suggestion)
            );
          }).pipe(
            Effect.withSpan("sqlite.write.accept_log", {
              kind: "client",
              attributes: sqliteSpanAttributes("INSERT", dbPath),
            })
          ),
      };
    })
  );
