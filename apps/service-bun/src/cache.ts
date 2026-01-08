import { HttpClient } from "@effect/platform/HttpClient";
import {
  type AddressSuggestionResult,
  addressQueryKey,
} from "@smart-address/core";
import { AddressSuggestionResultSchema } from "@smart-address/core/schema";
import { Cache, Context, Effect, Either, Layer, Option, Ref } from "effect";
import { currentTimeMillis } from "effect/Clock";
import {
  type DurationInput,
  hours,
  minutes,
  seconds,
  toMillis,
} from "effect/Duration";
import { type Equal, symbol as equalSymbol } from "effect/Equal";
import { hash, symbol as hashSymbol } from "effect/Hash";
import {
  decodeUnknownSync,
  Number as SchemaNumber,
  Struct,
} from "effect/Schema";
import { AddressMetrics, type CacheMetricEvent } from "./metrics";
import type { SuggestRequest } from "./request";
import { type CacheEventUpdate, RequestEvent } from "./request-event";
import { AddressSearchLog } from "./search-log";
import { AddressSuggestor } from "./service";
import {
  type AddressSqliteConfig,
  openAddressSqlite,
  sqliteSpanAttributes,
} from "./sqlite";

interface AddressCacheEntry {
  readonly storedAt: number;
  readonly staleAt: number;
  readonly expiresAt: number;
  readonly result: AddressSuggestionResult;
}

const AddressCacheEntrySchema = Struct({
  storedAt: SchemaNumber,
  staleAt: SchemaNumber,
  expiresAt: SchemaNumber,
  result: AddressSuggestionResultSchema,
});

export interface AddressCacheStore {
  readonly get: (key: string) => Effect.Effect<AddressCacheEntry | null>;
  readonly set: (key: string, entry: AddressCacheEntry) => Effect.Effect<void>;
}

export const AddressCacheStore =
  Context.GenericTag<AddressCacheStore>("AddressCacheStore");

export const AddressCacheStoreMemory = Layer.effect(
  AddressCacheStore,
  Effect.gen(function* () {
    const store = yield* Ref.make(new Map<string, AddressCacheEntry>());
    return {
      get: (key) =>
        Effect.gen(function* () {
          const now = yield* currentTimeMillis;
          return yield* Ref.modify(store, (current) => {
            const entry = current.get(key);
            if (!entry) {
              return [null, current] as const;
            }
            if (entry.expiresAt <= now) {
              const next = new Map(current);
              next.delete(key);
              return [null, next] as const;
            }
            return [entry, current] as const;
          });
        }),
      set: (key, entry) =>
        Ref.update(store, (current) => {
          const next = new Map(current);
          next.set(key, entry);
          return next;
        }),
    };
  })
);

export const AddressCacheStoreSqlite = (config: AddressSqliteConfig = {}) =>
  Layer.effect(
    AddressCacheStore,
    Effect.sync(() => {
      const { db } = openAddressSqlite(config);
      const select = db.prepare(
        "SELECT entry_json, expires_at FROM address_cache WHERE key = ?"
      );
      const remove = db.prepare("DELETE FROM address_cache WHERE key = ?");
      const upsert = db.prepare(`
        INSERT INTO address_cache (
          key,
          stored_at,
          stale_at,
          expires_at,
          entry_json
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          stored_at = excluded.stored_at,
          stale_at = excluded.stale_at,
          expires_at = excluded.expires_at,
          entry_json = excluded.entry_json;
      `);

      return {
        get: (key) =>
          Effect.gen(function* () {
            const row = select.get(key) as
              | { entry_json: string; expires_at: number }
              | undefined;
            if (!row) {
              return null;
            }
            const now = yield* currentTimeMillis;
            if (row.expires_at <= now) {
              remove.run(key);
              return null;
            }
            try {
              const parsed = JSON.parse(row.entry_json);
              const decoded = decodeUnknownSync(AddressCacheEntrySchema)(
                parsed
              );
              return decoded;
            } catch {
              remove.run(key);
              return null;
            }
          }).pipe(
            Effect.withSpan("sqlite.read.cache", {
              kind: "client",
              attributes: sqliteSpanAttributes("SELECT"),
            })
          ),
        set: (key, entry) =>
          Effect.sync(() => {
            const storedAt = Number.isFinite(entry.storedAt)
              ? entry.storedAt
              : Date.now();
            const staleAt = Number.isFinite(entry.staleAt)
              ? entry.staleAt
              : storedAt;
            const expiresAt = Number.isFinite(entry.expiresAt)
              ? entry.expiresAt
              : storedAt;
            upsert.run(
              key,
              storedAt,
              staleAt,
              expiresAt,
              JSON.stringify(entry)
            );
          })
            .pipe(
              Effect.withSpan("sqlite.write.cache", {
                kind: "client",
                attributes: sqliteSpanAttributes("INSERT"),
              })
            )
            .pipe(Effect.asVoid),
      };
    })
  );

export interface AddressCacheConfig {
  readonly l1Capacity?: number;
  readonly l1Ttl?: DurationInput;
  readonly l2BaseTtl?: DurationInput;
  readonly l2MinTtl?: DurationInput;
  readonly l2MaxTtl?: DurationInput;
  readonly l2BaseSWR?: DurationInput;
}

const defaultCacheConfig: Required<AddressCacheConfig> = {
  l1Capacity: 500,
  l1Ttl: seconds(10),
  l2BaseTtl: minutes(30),
  l2MinTtl: minutes(2),
  l2MaxTtl: hours(12),
  l2BaseSWR: minutes(5),
};

interface CachePolicy {
  readonly shouldStore: boolean;
  readonly ttlMs: number;
  readonly swrMs: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const computePolicy = (
  request: SuggestRequest,
  result: AddressSuggestionResult,
  config: Required<AddressCacheConfig>
): CachePolicy => {
  if (result.suggestions.length === 0) {
    return { shouldStore: false, ttlMs: 0, swrMs: 0 };
  }

  const length = request.query.text.trim().length;
  const lengthBoost = Math.max(0, Math.min(12, length - 3));
  const baseTtl = toMillis(config.l2BaseTtl);
  const baseSWR = toMillis(config.l2BaseSWR);
  const minTtl = toMillis(config.l2MinTtl);
  const maxTtl = toMillis(config.l2MaxTtl);

  const strategyBoost = request.strategy === "fast" ? 0.85 : 1;
  const ttlMs = clamp(
    baseTtl * 1.12 ** lengthBoost * strategyBoost,
    minTtl,
    maxTtl
  );
  const swrMs = Math.min(baseSWR * 1.05 ** lengthBoost, ttlMs * 0.8);

  return { shouldStore: true, ttlMs, swrMs };
};

const makeCacheKey = (request: SuggestRequest) =>
  `${request.strategy}:${addressQueryKey(request.query)}`;

const cacheKeyHash = (key: string) => Math.abs(hash(key)).toString(16);

class AddressCacheKey implements Equal {
  readonly key: string;
  readonly request: SuggestRequest;
  readonly fetch: Effect.Effect<AddressSuggestionResult, never, never>;
  readonly requestEvent: RequestEvent | undefined;

  constructor(
    key: string,
    request: SuggestRequest,
    fetch: Effect.Effect<AddressSuggestionResult, never, never>,
    requestEvent: RequestEvent | undefined
  ) {
    this.key = key;
    this.request = request;
    this.fetch = fetch;
    this.requestEvent = requestEvent;
  }

  [hashSymbol](): number {
    return hash(this.key);
  }

  [equalSymbol](that: Equal): boolean {
    return that instanceof AddressCacheKey && that.key === this.key;
  }
}

export interface AddressSuggestionCache {
  readonly getOrFetch: (
    request: SuggestRequest,
    fetch: Effect.Effect<AddressSuggestionResult, never, never>
  ) => Effect.Effect<AddressSuggestionResult, never, never>;
}

export const AddressSuggestionCache =
  Context.GenericTag<AddressSuggestionCache>("AddressSuggestionCache");

export const AddressSuggestionCacheLayer = (config: AddressCacheConfig = {}) =>
  Layer.effect(
    AddressSuggestionCache,
    Effect.gen(function* () {
      const store = yield* AddressCacheStore;
      const metrics = yield* AddressMetrics;
      const revalidating = yield* Ref.make(new Set<string>());
      const overrides = Object.fromEntries(
        Object.entries(config).filter(([, value]) => value !== undefined)
      ) as Partial<AddressCacheConfig>;
      const resolved = { ...defaultCacheConfig, ...overrides };
      const l1TtlMs = toMillis(resolved.l1Ttl);
      const recordCacheMetric = (event: CacheMetricEvent) =>
        metrics.recordCache(event).pipe(Effect.catchAll(() => Effect.void));

      const recordCacheUpdate = (update: CacheEventUpdate) =>
        Effect.serviceOption(RequestEvent).pipe(
          Effect.flatMap((maybeEvent) =>
            Option.match(maybeEvent, {
              onNone: () => Effect.void,
              onSome: (event) => event.recordCache(update),
            })
          ),
          Effect.catchAll(() => Effect.void)
        );

      const recordCacheUpdateWith = (
        update: CacheEventUpdate,
        requestEvent: RequestEvent | undefined
      ) =>
        requestEvent
          ? requestEvent
              .recordCache(update)
              .pipe(Effect.catchAll(() => Effect.void))
          : recordCacheUpdate(update);

      const provideRequestEvent = <A>(
        effect: Effect.Effect<A, never, never>,
        requestEvent: RequestEvent | undefined
      ) =>
        requestEvent
          ? effect.pipe(Effect.provideService(RequestEvent, requestEvent))
          : effect;

      const storeEntry = (
        key: string,
        request: SuggestRequest,
        result: AddressSuggestionResult,
        requestEvent: RequestEvent | undefined
      ) =>
        Effect.gen(function* () {
          const policy = computePolicy(request, result, resolved);
          if (!policy.shouldStore) {
            return;
          }
          const now = yield* currentTimeMillis;
          const entry: AddressCacheEntry = {
            storedAt: now,
            staleAt: now + policy.swrMs,
            expiresAt: now + policy.ttlMs,
            result,
          };
          const keyHash = cacheKeyHash(key);
          yield* store
            .set(key, entry)
            .pipe(
              Effect.withSpan("cache.set", {
                kind: "internal",
                attributes: {
                  "cache.layer": "l2",
                  "cache.key_hash": keyHash,
                  "cache.ttl_ms": policy.ttlMs,
                },
              })
            );
          yield* recordCacheUpdateWith(
            {
              ttlMs: policy.ttlMs,
              swrMs: policy.swrMs,
            },
            requestEvent
          );
        }).pipe(Effect.catchAll(() => Effect.void));

      const storeEntryWithoutEvent = (
        key: string,
        request: SuggestRequest,
        result: AddressSuggestionResult
      ) => storeEntry(key, request, result, undefined);

      const recordCacheUpdateInfo = (
        update: CacheEventUpdate,
        entryKey: AddressCacheKey
      ) => recordCacheUpdateWith(update, entryKey.requestEvent);

      const revalidate = (
        key: string,
        request: SuggestRequest,
        fetch: Effect.Effect<AddressSuggestionResult>
      ) =>
        Effect.gen(function* () {
          const shouldStart = yield* Ref.modify(revalidating, (current) => {
            if (current.has(key)) {
              return [false, current] as const;
            }
            const next = new Set(current);
            next.add(key);
            return [true, next] as const;
          });
          if (!shouldStart) {
            return;
          }
          yield* Effect.forkDaemon(
            fetch.pipe(
              Effect.tap((result) =>
                storeEntryWithoutEvent(key, request, result)
              ),
              Effect.catchAll(() => Effect.void),
              Effect.ensuring(
                Ref.update(revalidating, (current) => {
                  const next = new Set(current);
                  next.delete(key);
                  return next;
                })
              )
            )
          );
        });

      const handleCacheHit = (
        entryKey: AddressCacheKey,
        cached: AddressCacheEntry,
        now: number
      ) =>
        Effect.gen(function* () {
          const isStale = cached.staleAt <= now;
          yield* recordCacheMetric("l2-hit");
          yield* recordCacheUpdateInfo(
            {
              l2: "hit",
              stale: isStale ? true : undefined,
              revalidated: isStale ? true : undefined,
              ttlMs: cached.expiresAt - cached.storedAt,
              swrMs: cached.staleAt - cached.storedAt,
            },
            entryKey
          );
          if (isStale) {
            yield* revalidate(entryKey.key, entryKey.request, entryKey.fetch);
          }
          return cached.result;
        });

      const fetchAndStore = (entryKey: AddressCacheKey) =>
        Effect.gen(function* () {
          yield* recordCacheMetric("l2-miss");
          yield* recordCacheUpdateInfo({ l2: "miss" }, entryKey);
          const result = yield* provideRequestEvent(
            entryKey.fetch,
            entryKey.requestEvent
          );
          yield* storeEntry(
            entryKey.key,
            entryKey.request,
            result,
            entryKey.requestEvent
          );
          return result;
        });

      const lookup = (entryKey: AddressCacheKey) =>
        Effect.gen(function* () {
          const now = yield* currentTimeMillis;
          const keyHash = cacheKeyHash(entryKey.key);
          const cached = yield* store
            .get(entryKey.key)
            .pipe(
              Effect.withSpan("cache.get", {
                kind: "internal",
                attributes: {
                  "cache.layer": "l2",
                  "cache.key_hash": keyHash,
                },
              }),
              Effect.tap((entry) =>
                Effect.annotateCurrentSpan({
                  "cache.hit": Boolean(entry),
                  "cache.ttl_ms": entry
                    ? Math.max(0, entry.expiresAt - now)
                    : undefined,
                })
              )
            );
          if (!cached || cached.expiresAt <= now) {
            return yield* fetchAndStore(entryKey);
          }
          return yield* handleCacheHit(entryKey, cached, now);
        });

      const l1 = yield* Cache.make({
        capacity: resolved.l1Capacity,
        timeToLive: resolved.l1Ttl,
        lookup,
      });

      return {
        getOrFetch: (request, fetch) =>
          Effect.gen(function* () {
            const maybeEvent = yield* Effect.serviceOption(RequestEvent);
            const requestEvent = Option.getOrUndefined(maybeEvent);
            const entryKey = new AddressCacheKey(
              makeCacheKey(request),
              request,
              fetch,
              requestEvent
            );
            const keyHash = cacheKeyHash(entryKey.key);
            const result = yield* l1
              .getEither(entryKey)
              .pipe(
                Effect.tap((value) =>
                  Effect.all(
                    [
                      Effect.annotateCurrentSpan({
                        "cache.hit": Either.isLeft(value),
                      }),
                      recordCacheMetric(
                        Either.isLeft(value) ? "l1-hit" : "l1-miss"
                      ),
                      recordCacheUpdateWith(
                        { l1: Either.isLeft(value) ? "hit" : "miss" },
                        requestEvent
                      ),
                    ],
                    { concurrency: "unbounded" }
                  ).pipe(Effect.asVoid)
                ),
                Effect.withSpan("cache.get", {
                  kind: "internal",
                  attributes: {
                    "cache.layer": "l1",
                    "cache.key_hash": keyHash,
                    "cache.ttl_ms": l1TtlMs,
                  },
                })
              );
            return Either.isLeft(result) ? result.left : result.right;
          }),
      };
    })
  );

export interface AddressCachedSuggestor {
  readonly suggest: (
    request: SuggestRequest
  ) => Effect.Effect<AddressSuggestionResult, never, never>;
}

export const AddressCachedSuggestor =
  Context.GenericTag<AddressCachedSuggestor>("AddressCachedSuggestor");

export const AddressCachedSuggestorLayer = Layer.effect(
  AddressCachedSuggestor,
  Effect.gen(function* () {
    const cache = yield* AddressSuggestionCache;
    const raw = yield* AddressSuggestor;
    const httpClient = yield* HttpClient;
    const log = yield* AddressSearchLog;
    const recordResult = (result: AddressSuggestionResult) =>
      Effect.serviceOption(RequestEvent).pipe(
        Effect.flatMap((maybeEvent) =>
          Option.match(maybeEvent, {
            onNone: () => Effect.void,
            onSome: (event) => event.recordResult(result),
          })
        ),
        Effect.catchAll(() => Effect.void)
      );
    const provideHttpClient = <A>(
      effect: Effect.Effect<A, never, HttpClient>
    ): Effect.Effect<A, never, never> =>
      effect.pipe(Effect.provideService(HttpClient, httpClient));
    return {
      suggest: (request) =>
        cache.getOrFetch(request, provideHttpClient(raw.suggest(request))).pipe(
          Effect.tap((result) => recordResult(result)),
          Effect.tap((result) =>
            log.record(request, result).pipe(Effect.catchAll(() => Effect.void))
          )
        ),
    };
  })
);
