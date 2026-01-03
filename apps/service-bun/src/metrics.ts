import { Context, Effect, Layer, Ref } from "effect";
import { currentTimeMillis } from "effect/Clock";

export type CacheMetricEvent = "l1-hit" | "l1-miss" | "l2-hit" | "l2-miss";

interface CacheCounters {
  readonly l1Hits: number;
  readonly l1Misses: number;
  readonly l2Hits: number;
  readonly l2Misses: number;
}

interface ProviderCounters {
  readonly calls: number;
  readonly errors: number;
  readonly totalLatencyMs: number;
  readonly minLatencyMs: number | null;
  readonly maxLatencyMs: number | null;
}

interface MetricsState {
  readonly cache: CacheCounters;
  readonly providers: Record<string, ProviderCounters>;
  readonly startedAt: number;
  readonly updatedAt: number;
}

export interface AddressMetricsSnapshot {
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly cache: {
    readonly requests: number;
    readonly hits: number;
    readonly l1Hits: number;
    readonly l1Misses: number;
    readonly l2Hits: number;
    readonly l2Misses: number;
    readonly hitRate: number;
    readonly l1HitRate: number;
    readonly l2HitRate: number;
  };
  readonly providers: ReadonlyArray<{
    readonly provider: string;
    readonly calls: number;
    readonly errors: number;
    readonly errorRate: number;
    readonly latencyMs: {
      readonly avg: number;
      readonly min: number | null;
      readonly max: number | null;
    };
  }>;
}

export interface AddressMetrics {
  readonly recordCache: (event: CacheMetricEvent) => Effect.Effect<void>;
  readonly recordProvider: (input: {
    readonly provider: string;
    readonly durationMs: number;
    readonly ok: boolean;
  }) => Effect.Effect<void>;
  readonly snapshot: Effect.Effect<AddressMetricsSnapshot>;
}

export const AddressMetrics =
  Context.GenericTag<AddressMetrics>("AddressMetrics");

const emptyCache: CacheCounters = {
  l1Hits: 0,
  l1Misses: 0,
  l2Hits: 0,
  l2Misses: 0,
};

const emptyProvider: ProviderCounters = {
  calls: 0,
  errors: 0,
  totalLatencyMs: 0,
  minLatencyMs: null,
  maxLatencyMs: null,
};

const updateCache = (cache: CacheCounters, event: CacheMetricEvent) => {
  switch (event) {
    case "l1-hit":
      return { ...cache, l1Hits: cache.l1Hits + 1 };
    case "l1-miss":
      return { ...cache, l1Misses: cache.l1Misses + 1 };
    case "l2-hit":
      return { ...cache, l2Hits: cache.l2Hits + 1 };
    case "l2-miss":
      return { ...cache, l2Misses: cache.l2Misses + 1 };
    default:
      return cache;
  }
};

const normalizeDuration = (value: number): number =>
  Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;

const updateProvider = (
  current: ProviderCounters,
  input: { readonly durationMs: number; readonly ok: boolean }
): ProviderCounters => {
  const duration = normalizeDuration(input.durationMs);
  const calls = current.calls + 1;
  const errors = current.errors + (input.ok ? 0 : 1);
  const totalLatencyMs = current.totalLatencyMs + duration;
  const minLatencyMs =
    current.minLatencyMs === null
      ? duration
      : Math.min(current.minLatencyMs, duration);
  const maxLatencyMs =
    current.maxLatencyMs === null
      ? duration
      : Math.max(current.maxLatencyMs, duration);
  return {
    calls,
    errors,
    totalLatencyMs,
    minLatencyMs,
    maxLatencyMs,
  };
};

const toSnapshot = (state: MetricsState): AddressMetricsSnapshot => {
  const l1Requests = state.cache.l1Hits + state.cache.l1Misses;
  const l2Requests = state.cache.l2Hits + state.cache.l2Misses;
  const hits = state.cache.l1Hits + state.cache.l2Hits;
  // hitRate uses L1 request volume; L2 hits still count as hits.
  const hitRate = l1Requests > 0 ? hits / l1Requests : 0;
  const l1HitRate = l1Requests > 0 ? state.cache.l1Hits / l1Requests : 0;
  const l2HitRate = l2Requests > 0 ? state.cache.l2Hits / l2Requests : 0;

  const providers = Object.entries(state.providers)
    .map(([provider, metrics]) => {
      const avg =
        metrics.calls > 0
          ? Math.round(metrics.totalLatencyMs / metrics.calls)
          : 0;
      const errorRate = metrics.calls > 0 ? metrics.errors / metrics.calls : 0;
      return {
        provider,
        calls: metrics.calls,
        errors: metrics.errors,
        errorRate,
        latencyMs: {
          avg,
          min: metrics.minLatencyMs,
          max: metrics.maxLatencyMs,
        },
      };
    })
    .sort((left, right) => left.provider.localeCompare(right.provider));

  return {
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
    cache: {
      requests: l1Requests,
      hits,
      l1Hits: state.cache.l1Hits,
      l1Misses: state.cache.l1Misses,
      l2Hits: state.cache.l2Hits,
      l2Misses: state.cache.l2Misses,
      hitRate,
      l1HitRate,
      l2HitRate,
    },
    providers,
  };
};

export const AddressMetricsLayer = Layer.effect(
  AddressMetrics,
  Effect.gen(function* () {
    const start = yield* currentTimeMillis;
    const state = yield* Ref.make<MetricsState>({
      cache: emptyCache,
      providers: {},
      startedAt: start,
      updatedAt: start,
    });

    const recordCache = (event: CacheMetricEvent) =>
      Effect.gen(function* () {
        const now = yield* currentTimeMillis;
        yield* Ref.update(state, (current) => ({
          ...current,
          updatedAt: now,
          cache: updateCache(current.cache, event),
        }));
      });

    const recordProvider = (input: {
      readonly provider: string;
      readonly durationMs: number;
      readonly ok: boolean;
    }) =>
      Effect.gen(function* () {
        const now = yield* currentTimeMillis;
        yield* Ref.update(state, (current) => {
          const existing = current.providers[input.provider] ?? emptyProvider;
          const nextProvider = updateProvider(existing, input);
          return {
            ...current,
            updatedAt: now,
            providers: {
              ...current.providers,
              [input.provider]: nextProvider,
            },
          };
        });
      });

    const snapshot = Ref.get(state).pipe(Effect.map(toSnapshot));

    return {
      recordCache,
      recordProvider,
      snapshot,
    };
  })
);
