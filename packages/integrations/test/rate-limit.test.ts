import { describe, expect, it } from "@effect-native/bun-test";
import { Effect, Fiber, Ref } from "effect";
import { currentTimeMillis } from "effect/Clock";
import { seconds } from "effect/Duration";
import { adjust } from "effect/TestClock";
import { TestContext } from "effect/TestContext";
import {
  AddressRateLimiter,
  AddressRateLimiterLive,
  makeAddressRateLimiter,
  withRateLimiter,
} from "../src/rate-limit";

const expectSpacing = (times: readonly number[]) => {
  expect(times).toHaveLength(2);
  expect(times[1] - times[0]).toBeGreaterThanOrEqual(1000);
};

const runSpaced = <A, E, R>(
  first: Effect.Effect<A, E, R>,
  second: Effect.Effect<A, E, R>
) =>
  Effect.gen(function* () {
    const firstFiber = yield* Effect.fork(first);
    const secondFiber = yield* Effect.fork(second);

    yield* adjust(seconds(1));
    yield* Fiber.join(firstFiber);
    yield* Fiber.join(secondFiber);
  });

describe("rate limiter", () => {
  it.effect("schedules effects with spacing", () =>
    Effect.gen(function* () {
      const program = Effect.gen(function* () {
        const limiter = yield* AddressRateLimiter;
        const times = yield* Ref.make<readonly number[]>([]);

        const record = Effect.gen(function* () {
          const now = yield* currentTimeMillis;
          yield* Ref.update(times, (current) => [...current, now]);
        });

        yield* runSpaced(limiter.schedule(record), limiter.schedule(record));

        return yield* Ref.get(times);
      }).pipe(
        Effect.provide(AddressRateLimiterLive(seconds(1))),
        Effect.provide(TestContext)
      );

      const times = yield* program;

      expectSpacing(times);
    })
  );

  it.effect("uses a shared limiter when wrapping providers", () =>
    Effect.gen(function* () {
      const program = Effect.gen(function* () {
        const limiter = yield* makeAddressRateLimiter(seconds(1));
        const times = yield* Ref.make<readonly number[]>([]);
        const provider = {
          name: "test",
          suggest: () =>
            Effect.gen(function* () {
              const now = yield* currentTimeMillis;
              yield* Ref.update(times, (current) => [...current, now]);
              return [];
            }),
        };

        const limited = withRateLimiter(provider, limiter);
        const request = { text: "Main" };

        yield* runSpaced(limited.suggest(request), limited.suggest(request));

        return yield* Ref.get(times);
      }).pipe(Effect.provide(TestContext));

      const times = yield* program;

      expectSpacing(times);
    })
  );
});
