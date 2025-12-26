import { Cache, Clock, Context, Effect, Layer, Ref } from "effect"
import * as Duration from "effect/Duration"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Schema from "effect/Schema"
import { addressQueryKey, type AddressSuggestionResult } from "@smart-address/core"
import { AddressSuggestionResultSchema } from "@smart-address/core/schema"
import { Redis } from "@upstash/redis"
import type { SuggestRequest } from "./request"
import { AddressSuggestor } from "./service"

type AddressCacheEntry = {
  readonly storedAt: number
  readonly staleAt: number
  readonly expiresAt: number
  readonly result: AddressSuggestionResult
}

const AddressCacheEntrySchema = Schema.Struct({
  storedAt: Schema.Number,
  staleAt: Schema.Number,
  expiresAt: Schema.Number,
  result: AddressSuggestionResultSchema
})

export interface AddressCacheStore {
  readonly get: (key: string) => Effect.Effect<AddressCacheEntry | null>
  readonly set: (key: string, entry: AddressCacheEntry, ttl: Duration.DurationInput) => Effect.Effect<void>
}

export const AddressCacheStore = Context.GenericTag<AddressCacheStore>("AddressCacheStore")

export const AddressCacheStoreMemory = Layer.effect(
  AddressCacheStore,
  Effect.gen(function* () {
    const store = yield* Ref.make(new Map<string, AddressCacheEntry>())
    return {
      get: (key) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis
          return yield* Ref.modify(store, (current) => {
            const entry = current.get(key)
            if (!entry) {
              return [null, current] as const
            }
            if (entry.expiresAt <= now) {
              const next = new Map(current)
              next.delete(key)
              return [null, next] as const
            }
            return [entry, current] as const
          })
        }),
      set: (key, entry) =>
        Ref.update(store, (current) => {
          const next = new Map(current)
          next.set(key, entry)
          return next
        })
    }
  })
)

export type AddressCacheStoreRedisConfig = {
  readonly url: string
  readonly token: string
  readonly prefix?: string
}

export const AddressCacheStoreRedis = (config: AddressCacheStoreRedisConfig) => {
  const redis = new Redis({ url: config.url, token: config.token })
  const prefix = config.prefix ? `${config.prefix}:` : ""

  return Layer.succeed(AddressCacheStore, {
    get: (key) =>
      Effect.tryPromise({
        try: async () => redis.get<string>(`${prefix}${key}`),
        catch: () => null
      }).pipe(
        Effect.flatMap((result) => {
          if (!result) {
            return Effect.succeed(null)
          }
          return Effect.try({
            try: () => JSON.parse(result),
            catch: () => null
          }).pipe(
            Effect.flatMap((parsed) =>
              parsed
                ? Schema.decodeUnknown(AddressCacheEntrySchema)(parsed).pipe(Effect.catchAll(() => Effect.succeed(null)))
                : Effect.succeed(null)
            ),
            Effect.catchAll(() => Effect.succeed(null))
          )
        }),
        Effect.orElseSucceed(() => null)
      ),
    set: (key, entry, ttl) =>
      Effect.tryPromise({
        try: async () => {
          const payload = JSON.stringify(entry)
          const ttlSeconds = Math.max(1, Math.ceil(Duration.toMillis(ttl) / 1000))
          await redis.set(`${prefix}${key}`, payload, { ex: ttlSeconds })
        },
        catch: () => undefined
      }).pipe(Effect.asVoid)
  })
}

export type AddressCacheConfig = {
  readonly l1Capacity?: number
  readonly l1Ttl?: Duration.DurationInput
  readonly l2BaseTtl?: Duration.DurationInput
  readonly l2MinTtl?: Duration.DurationInput
  readonly l2MaxTtl?: Duration.DurationInput
  readonly l2BaseSWR?: Duration.DurationInput
}

const defaultCacheConfig: Required<AddressCacheConfig> = {
  l1Capacity: 500,
  l1Ttl: Duration.seconds(10),
  l2BaseTtl: Duration.minutes(30),
  l2MinTtl: Duration.minutes(2),
  l2MaxTtl: Duration.hours(12),
  l2BaseSWR: Duration.minutes(5)
}

type CachePolicy = {
  readonly shouldStore: boolean
  readonly ttlMs: number
  readonly swrMs: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const computePolicy = (
  request: SuggestRequest,
  result: AddressSuggestionResult,
  config: Required<AddressCacheConfig>
): CachePolicy => {
  if (result.suggestions.length === 0) {
    return { shouldStore: false, ttlMs: 0, swrMs: 0 }
  }

  const length = request.query.text.trim().length
  const lengthBoost = Math.max(0, Math.min(12, length - 3))
  const baseTtl = Duration.toMillis(config.l2BaseTtl)
  const baseSWR = Duration.toMillis(config.l2BaseSWR)
  const minTtl = Duration.toMillis(config.l2MinTtl)
  const maxTtl = Duration.toMillis(config.l2MaxTtl)

  const strategyBoost = request.strategy === "fast" ? 0.85 : 1
  const ttlMs = clamp(baseTtl * Math.pow(1.12, lengthBoost) * strategyBoost, minTtl, maxTtl)
  const swrMs = Math.min(baseSWR * Math.pow(1.05, lengthBoost), ttlMs * 0.8)

  return { shouldStore: true, ttlMs, swrMs }
}

const makeCacheKey = (request: SuggestRequest) =>
  `${request.strategy}:${addressQueryKey(request.query)}`

class AddressCacheKey implements Equal.Equal {
  readonly key: string
  readonly request: SuggestRequest
  readonly fetch: Effect.Effect<AddressSuggestionResult, never, any>

  constructor(key: string, request: SuggestRequest, fetch: Effect.Effect<AddressSuggestionResult, never, any>) {
    this.key = key
    this.request = request
    this.fetch = fetch
  }

  [Hash.symbol](): number {
    return Hash.hash(this.key)
  }

  [Equal.symbol](that: Equal.Equal): boolean {
    return typeof that === "object" && that !== null && "key" in that && (that as { key: string }).key === this.key
  }
}

export interface AddressSuggestionCache {
  readonly getOrFetch: <R>(
    request: SuggestRequest,
    fetch: Effect.Effect<AddressSuggestionResult, never, R>
  ) => Effect.Effect<AddressSuggestionResult, never, R>
}

export const AddressSuggestionCache = Context.GenericTag<AddressSuggestionCache>("AddressSuggestionCache")

export const AddressSuggestionCacheLayer = (config: AddressCacheConfig = {}) =>
  Layer.effect(
    AddressSuggestionCache,
    Effect.gen(function* () {
      const store = yield* AddressCacheStore
      const revalidating = yield* Ref.make(new Set<string>())
      const overrides = Object.fromEntries(
        Object.entries(config).filter(([, value]) => value !== undefined)
      ) as Partial<AddressCacheConfig>
      const resolved = { ...defaultCacheConfig, ...overrides }

      const storeEntry = (key: string, request: SuggestRequest, result: AddressSuggestionResult) =>
        Effect.gen(function* () {
          const policy = computePolicy(request, result, resolved)
          if (!policy.shouldStore) {
            return
          }
          const now = yield* Clock.currentTimeMillis
          const entry: AddressCacheEntry = {
            storedAt: now,
            staleAt: now + policy.swrMs,
            expiresAt: now + policy.ttlMs,
            result
          }
          yield* store.set(key, entry, Duration.millis(policy.ttlMs))
        }).pipe(Effect.catchAll(() => Effect.void))

      const revalidate = (key: string, request: SuggestRequest, fetch: Effect.Effect<AddressSuggestionResult>) =>
        Effect.gen(function* () {
          const shouldStart = yield* Ref.modify(revalidating, (current) => {
            if (current.has(key)) {
              return [false, current] as const
            }
            const next = new Set(current)
            next.add(key)
            return [true, next] as const
          })
          if (!shouldStart) {
            return
          }
          yield* Effect.forkDaemon(
            fetch.pipe(
              Effect.tap((result) => storeEntry(key, request, result)),
              Effect.catchAll(() => Effect.void),
              Effect.ensuring(
                Ref.update(revalidating, (current) => {
                  const next = new Set(current)
                  next.delete(key)
                  return next
                })
              )
            )
          )
        })

      const lookup = (entryKey: AddressCacheKey) =>
        Effect.gen(function* () {
          const cached = yield* store.get(entryKey.key)
          const now = yield* Clock.currentTimeMillis
          if (cached && cached.expiresAt > now) {
            if (cached.staleAt <= now) {
              yield* revalidate(entryKey.key, entryKey.request, entryKey.fetch)
            }
            return cached.result
          }
          const result = yield* entryKey.fetch
          yield* storeEntry(entryKey.key, entryKey.request, result)
          return result
        })

      const l1 = yield* Cache.make({
        capacity: resolved.l1Capacity,
        timeToLive: resolved.l1Ttl,
        lookup
      })

      return {
        getOrFetch: (request, fetch) => l1.get(new AddressCacheKey(makeCacheKey(request), request, fetch))
      }
    })
  )

export interface AddressCachedSuggestor {
  readonly suggest: (request: SuggestRequest) => Effect.Effect<AddressSuggestionResult, never, any>
}

export const AddressCachedSuggestor = Context.GenericTag<AddressCachedSuggestor>("AddressCachedSuggestor")

export const AddressCachedSuggestorLayer = Layer.effect(
  AddressCachedSuggestor,
  Effect.gen(function* () {
    const cache = yield* AddressSuggestionCache
    const raw = yield* AddressSuggestor
    return {
      suggest: (request) => cache.getOrFetch(request, raw.suggest(request))
    }
  })
)
