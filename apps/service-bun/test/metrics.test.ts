import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import { TestContext } from "effect/TestContext";
import { AddressMetrics, AddressMetricsLayer } from "../src/metrics";

describe("address metrics", () => {
  it.effect("tracks cache and provider metrics", () =>
    Effect.gen(function* () {
      const metrics = yield* AddressMetrics;

      yield* metrics.recordCache("l1-hit");
      yield* metrics.recordCache("l1-miss");
      yield* metrics.recordCache("l2-hit");
      yield* metrics.recordCache("l2-miss");

      yield* metrics.recordProvider({
        provider: "nominatim",
        durationMs: 120,
        ok: true,
      });
      yield* metrics.recordProvider({
        provider: "nominatim",
        durationMs: 300,
        ok: false,
      });
      yield* metrics.recordProvider({
        provider: "radar-autocomplete",
        durationMs: 50,
        ok: true,
      });

      const snapshot = yield* metrics.snapshot;
      const nominatim = snapshot.providers.find(
        (provider) => provider.provider === "nominatim"
      );

      expect(snapshot.cache.l1Hits).toBe(1);
      expect(snapshot.cache.l1Misses).toBe(1);
      expect(snapshot.cache.l2Hits).toBe(1);
      expect(snapshot.cache.l2Misses).toBe(1);
      expect(snapshot.cache.requests).toBe(2);
      expect(snapshot.cache.hitRate).toBe(1);

      expect(nominatim?.calls).toBe(2);
      expect(nominatim?.errors).toBe(1);
      expect(nominatim?.latencyMs.avg).toBe(210);
      expect(nominatim?.latencyMs.min).toBe(120);
      expect(nominatim?.latencyMs.max).toBe(300);
    }).pipe(Effect.provide(AddressMetricsLayer), Effect.provide(TestContext))
  );
});
