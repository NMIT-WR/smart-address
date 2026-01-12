import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import { TestContext } from "effect/TestContext";
import {
  AddressMetrics,
  AddressMetricsLayer,
  renderPrometheusMetrics,
} from "../src/metrics";

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

  it.effect("handles cache-only snapshots", () =>
    Effect.gen(function* () {
      const metrics = yield* AddressMetrics;

      yield* metrics.recordCache("l1-hit");
      yield* metrics.recordCache("l2-miss");

      const snapshot = yield* metrics.snapshot;

      expect(snapshot.providers).toHaveLength(0);
      expect(snapshot.cache.requests).toBe(1);
      expect(snapshot.cache.hits).toBe(1);
      expect(snapshot.cache.hitRate).toBe(1);
      expect(snapshot.cache.l2HitRate).toBe(0);
    }).pipe(Effect.provide(AddressMetricsLayer), Effect.provide(TestContext))
  );

  it.effect("records zero-duration provider calls", () =>
    Effect.gen(function* () {
      const metrics = yield* AddressMetrics;

      yield* metrics.recordProvider({
        provider: "instant",
        durationMs: 0,
        ok: true,
      });

      const snapshot = yield* metrics.snapshot;
      const provider = snapshot.providers.find(
        (entry) => entry.provider === "instant"
      );

      expect(provider?.calls).toBe(1);
      expect(provider?.errors).toBe(0);
      expect(provider?.latencyMs.avg).toBe(0);
      expect(provider?.latencyMs.min).toBe(0);
      expect(provider?.latencyMs.max).toBe(0);
    }).pipe(Effect.provide(AddressMetricsLayer), Effect.provide(TestContext))
  );

  it.effect("omits min/max Prometheus metrics when missing", () =>
    Effect.succeed(
      renderPrometheusMetrics({
        startedAt: 0,
        updatedAt: 0,
        cache: {
          requests: 0,
          hits: 0,
          l1Hits: 0,
          l1Misses: 0,
          l2Hits: 0,
          l2Misses: 0,
          hitRate: 0,
          l1HitRate: 0,
          l2HitRate: 0,
        },
        providers: [
          {
            provider: "empty-provider",
            calls: 0,
            errors: 0,
            errorRate: 0,
            latencyMs: { avg: 0, min: null, max: null },
          },
        ],
      })
    ).pipe(
      Effect.tap((output) =>
        Effect.sync(() => {
          expect(output).toContain('stat="avg"');
          expect(output).not.toContain('stat="min"');
          expect(output).not.toContain('stat="max"');
        })
      ),
      Effect.asVoid,
      Effect.provide(TestContext)
    )
  );
});
