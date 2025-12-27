import { describe, expect, it } from "@effect-native/bun-test"
import { Clock, Effect, Ref } from "effect"
import * as Duration from "effect/Duration"
import * as TestContext from "effect/TestContext"
import { addressQueryKey } from "@smart-address/core"
import { AddressSuggestionCacheLayer, AddressCacheStore, AddressCacheStoreMemory, AddressSuggestionCache } from "../src/cache"

const sampleResult = {
  suggestions: [
    {
      id: "sample:1",
      label: "Sample",
      address: { line1: "Sample" },
      source: { provider: "sample" }
    }
  ],
  errors: []
}

describe("address cache", () => {
  it("dedupes requests within L1 TTL", async () => {
    const program = Effect.gen(function* () {
      const cache = yield* AddressSuggestionCache
      const counter = yield* Ref.make(0)
      const request = {
        query: { text: "Main St" },
        strategy: "reliable" as const
      }

      const fetch = Ref.update(counter, (value) => value + 1).pipe(Effect.as(sampleResult))

      yield* cache.getOrFetch(request, fetch)
      yield* cache.getOrFetch(request, fetch)

      return yield* Ref.get(counter)
    }).pipe(
      Effect.provide(AddressSuggestionCacheLayer({ l1Ttl: Duration.seconds(60) })),
      Effect.provide(AddressCacheStoreMemory),
      Effect.provide(TestContext.TestContext)
    )

    const count = await Effect.runPromise(program)
    expect(count).toBe(1)
  })

  it("returns L2 cached results without fetching", async () => {
    const program = Effect.gen(function* () {
      const cache = yield* AddressSuggestionCache
      const store = yield* AddressCacheStore
      const counter = yield* Ref.make(0)
      const request = {
        query: { text: "Old Town" },
        strategy: "reliable" as const
      }
      const key = `${request.strategy}:${addressQueryKey(request.query)}`
      const now = yield* Clock.currentTimeMillis
      yield* store.set(
        key,
        {
          storedAt: now - 1000,
          staleAt: now + 5000,
          expiresAt: now + 10000,
          result: sampleResult
        },
        Duration.seconds(30)
      )

      const fetch = Ref.update(counter, (value) => value + 1).pipe(Effect.as(sampleResult))
      const result = yield* cache.getOrFetch(request, fetch)

      return { result, count: yield* Ref.get(counter) }
    }).pipe(
      Effect.provide(AddressSuggestionCacheLayer()),
      Effect.provide(AddressCacheStoreMemory),
      Effect.provide(TestContext.TestContext)
    )

    const { result, count } = await Effect.runPromise(program)
    expect(count).toBe(0)
    expect(result.suggestions[0]?.id).toBe("sample:1")
  })
})
