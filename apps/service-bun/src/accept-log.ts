import { addressQueryKey, normalizeAddressQuery } from "@smart-address/core";
import { Context, Effect, Layer } from "effect";
import type { AcceptRequest } from "./accept-request";
import { type AddressSqliteConfig, openAddressSqlite } from "./sqlite";

export interface AddressAcceptLog {
  readonly record: (request: AcceptRequest) => Effect.Effect<void>;
}

export const AddressAcceptLog =
  Context.GenericTag<AddressAcceptLog>("AddressAcceptLog");

export const AddressAcceptLogNone = Layer.succeed(AddressAcceptLog, {
  record: () => Effect.void,
});

export const AddressAcceptLogSqlite = (config: AddressSqliteConfig = {}) =>
  Layer.effect(
    AddressAcceptLog,
    Effect.try(() => {
      const { db } = openAddressSqlite(config);
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
            const normalized = normalizeAddressQuery(request.query);
            const cacheKey = `${request.strategy}:${addressQueryKey(normalized)}`;
            const suggestion = request.suggestion;
            insert.run(
              Date.now(),
              request.query.text,
              normalized.text,
              request.strategy,
              normalized.limit ?? null,
              normalized.countryCode ?? null,
              normalized.locale ?? null,
              normalized.sessionToken ?? null,
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
          }),
      };
    })
  );
