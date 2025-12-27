import { describe, expect, it } from "@effect-native/bun-test"
import { Effect, Fiber, Ref } from "effect"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as TestClock from "effect/TestClock"
import * as TestContext from "effect/TestContext"
import {
  AddressRateLimiter,
  AddressRateLimiterLive,
  makeAddressRateLimiter,
  withRateLimiter
} from "../src/rate-limit"

describe("rate limiter", () => {
  it("schedules effects with spacing", async () => {
    const program = Effect.gen(function* () {
      const limiter = yield* AddressRateLimiter
      const times = yield* Ref.make<ReadonlyArray<number>>([])

      const record = Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis
        yield* Ref.update(times, (current) => [...current, now])
      })

      const first = yield* Effect.fork(limiter.schedule(record))
      const second = yield* Effect.fork(limiter.schedule(record))

      yield* TestClock.adjust(Duration.seconds(1))
      yield* Fiber.join(first)
      yield* Fiber.join(second)

      return yield* Ref.get(times)
    }).pipe(
      Effect.provide(AddressRateLimiterLive(Duration.seconds(1))),
      Effect.provide(TestContext.TestContext)
    )

    const times = await Effect.runPromise(program)

    expect(times).toHaveLength(2)
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(1000)
  })

  it("uses a shared limiter when wrapping providers", async () => {
    const program = Effect.gen(function* () {
      const limiter = yield* makeAddressRateLimiter(Duration.seconds(1))
      const times = yield* Ref.make<ReadonlyArray<number>>([])
      const provider = {
        name: "test",
        suggest: () =>
          Effect.gen(function* () {
            const now = yield* Clock.currentTimeMillis
            yield* Ref.update(times, (current) => [...current, now])
            return []
          })
      }

      const limited = withRateLimiter(provider, limiter)
      const request = { text: "Main" }

      const first = yield* Effect.fork(limited.suggest(request))
      const second = yield* Effect.fork(limited.suggest(request))

      yield* TestClock.adjust(Duration.seconds(1))
      yield* Fiber.join(first)
      yield* Fiber.join(second)

      return yield* Ref.get(times)
    }).pipe(Effect.provide(TestContext.TestContext))

    const times = await Effect.runPromise(program)

    expect(times).toHaveLength(2)
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(1000)
  })
})
