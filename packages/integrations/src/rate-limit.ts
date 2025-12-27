import * as Clock from "effect/Clock"
import { Context, Effect, Layer, Ref } from "effect"
import * as Duration from "effect/Duration"
import type { AddressProvider } from "@smart-address/core"

export interface AddressRateLimiter {
  readonly schedule: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}

export const AddressRateLimiter = Context.GenericTag<AddressRateLimiter>("AddressRateLimiter")

const makeIntervalLimiter = (interval: Duration.DurationInput): Effect.Effect<AddressRateLimiter> =>
  Effect.gen(function* () {
    const intervalMs = Duration.toMillis(interval)
    const nextReadyAt = yield* Ref.make(0)

    const schedule: AddressRateLimiter["schedule"] = (effect) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis
        const startAt = yield* Ref.modify(nextReadyAt, (nextAt) => {
          const scheduled = Math.max(nextAt, now)
          return [scheduled, scheduled + intervalMs] as const
        })
        const delay = startAt - now
        if (delay > 0) {
          yield* Effect.sleep(Duration.millis(delay))
        }
        return yield* effect
      })

    return { schedule }
  })

export const makeAddressRateLimiter = (interval: Duration.DurationInput) => makeIntervalLimiter(interval)

export const AddressRateLimiterLive = (interval: Duration.DurationInput = Duration.seconds(1)) =>
  Layer.effect(AddressRateLimiter, makeIntervalLimiter(interval))

export const AddressRateLimiterNone = Layer.succeed(AddressRateLimiter, {
  schedule: (effect) => effect
})

export const withRateLimiter = <R>(
  provider: AddressProvider<R>,
  limiter: AddressRateLimiter
): AddressProvider<R> => ({
  name: provider.name,
  suggest: (query) => limiter.schedule(provider.suggest(query))
})

export const withRateLimit = <R>(provider: AddressProvider<R>): AddressProvider<R | AddressRateLimiter> => ({
  name: provider.name,
  suggest: (query) =>
    Effect.gen(function* () {
      const limiter = yield* AddressRateLimiter
      return yield* limiter.schedule(provider.suggest(query))
    })
})
