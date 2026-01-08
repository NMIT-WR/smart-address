import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import { TestContext } from "effect/TestContext";
import {
  makeRequestEvent,
  RequestEventConfigLayer,
} from "../src/request-event";

const baseInit = {
  requestId: "req_test",
  kind: "suggest" as const,
  source: "http" as const,
  method: "GET",
  path: "/suggest",
};

const baseConfig = {
  serviceName: "test-service",
  serviceVersion: "test",
};

describe("request event", () => {
  it.effect("drops fast requests when sampled out", () =>
    Effect.gen(function* () {
      const requestEvent = yield* makeRequestEvent(baseInit);
      const finalized = yield* requestEvent.finalize(200);

      expect(finalized).not.toBeUndefined();
      expect(finalized?.decision.keep).toBe(false);
      expect(finalized?.decision.reason).toBe("drop");
    }).pipe(
      Effect.provide(
        RequestEventConfigLayer({
          ...baseConfig,
          sampleRate: 0,
          slowThresholdMs: 10_000,
          random: () => 0.99,
        })
      ),
      Effect.provide(TestContext)
    )
  );

  it.effect("keeps error requests", () =>
    Effect.gen(function* () {
      const requestEvent = yield* makeRequestEvent(baseInit);
      yield* requestEvent.recordError("boom");
      const finalized = yield* requestEvent.finalize(500);

      expect(finalized?.decision.keep).toBe(true);
      expect(finalized?.decision.reason).toBe("error");
    }).pipe(
      Effect.provide(
        RequestEventConfigLayer({
          ...baseConfig,
          sampleRate: 0,
          slowThresholdMs: 10_000,
          random: () => 0.5,
        })
      ),
      Effect.provide(TestContext)
    )
  );

  it.effect("keeps slow requests", () =>
    Effect.gen(function* () {
      const requestEvent = yield* makeRequestEvent(baseInit);
      const finalized = yield* requestEvent.finalize(200);

      expect(finalized?.decision.keep).toBe(true);
      expect(finalized?.decision.reason).toBe("slow");
    }).pipe(
      Effect.provide(
        RequestEventConfigLayer({
          ...baseConfig,
          sampleRate: 0,
          slowThresholdMs: 0,
          random: () => 0.5,
        })
      ),
      Effect.provide(TestContext)
    )
  );

  it.effect("forces sampling when marked important", () =>
    Effect.gen(function* () {
      const requestEvent = yield* makeRequestEvent(baseInit);
      yield* requestEvent.markImportant();
      const finalized = yield* requestEvent.finalize(200);

      expect(finalized?.decision.keep).toBe(true);
      expect(finalized?.decision.reason).toBe("forced");
    }).pipe(
      Effect.provide(
        RequestEventConfigLayer({
          ...baseConfig,
          sampleRate: 0,
          slowThresholdMs: 10_000,
          random: () => 0.5,
        })
      ),
      Effect.provide(TestContext)
    )
  );
});
