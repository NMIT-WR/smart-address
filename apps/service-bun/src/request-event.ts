import { createHash } from "node:crypto";
import type {
  AddressProviderPlan,
  AddressQuery,
  AddressSuggestionResult,
} from "@smart-address/core";
import { addressQueryKey, normalizeAddressQuery } from "@smart-address/core";
import type { AddressStrategy } from "@smart-address/rpc/suggest";
import { Context, Effect, Layer, Option, Ref } from "effect";
import { currentTimeMillis } from "effect/Clock";
import type { AcceptRequest } from "./accept-request";
import type { SuggestRequest } from "./request";

export type RequestEventKind =
  | "suggest"
  | "accept"
  | "metrics"
  | "health"
  | "demo.legacy"
  | "demo.sdk"
  | "rpc.suggest"
  | "mcp.suggest"
  | "options";

type RequestEventSource = "http" | "rpc" | "mcp";

interface RequestEventInit {
  readonly requestId: string;
  readonly kind: RequestEventKind;
  readonly source: RequestEventSource;
  readonly method?: string;
  readonly path?: string;
}

export interface RequestEventConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string | undefined;
  readonly sampleRate: number;
  readonly slowThresholdMs: number;
  readonly logRawQuery: boolean;
  readonly alwaysSample?: boolean | undefined;
  readonly random?: (() => number) | undefined;
}

export const RequestEventConfig =
  Context.GenericTag<RequestEventConfig>("RequestEventConfig");

export const RequestEventConfigLayer = (config: RequestEventConfig) =>
  Layer.succeed(RequestEventConfig, config);

export interface CacheEventUpdate {
  readonly l1?: "hit" | "miss" | undefined;
  readonly l2?: "hit" | "miss" | undefined;
  readonly stale?: boolean | undefined;
  readonly revalidated?: boolean | undefined;
  readonly ttlMs?: number | undefined;
  readonly swrMs?: number | undefined;
}

export interface ProviderEvent {
  readonly provider: string;
  readonly durationMs: number;
  readonly ok: boolean;
}

interface WideEvent {
  readonly timestamp: string;
  readonly requestId: string;
  readonly traceId?: string | undefined;
  readonly spanId?: string | undefined;
  readonly kind: RequestEventKind;
  readonly source: RequestEventSource;
  readonly service: string;
  readonly version?: string | undefined;
  readonly method?: string | undefined;
  readonly path?: string | undefined;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly strategy?: AddressStrategy | undefined;
  readonly query?: AddressQuery | undefined;
  readonly normalizedQuery?: AddressQuery | undefined;
  readonly queryHash?: string | undefined;
  readonly cacheKey?: string | undefined;
  readonly cache?: CacheEventUpdate | undefined;
  readonly plan?:
    | {
        readonly stages: ReadonlyArray<{
          readonly name?: string | undefined;
          readonly concurrency?: number | "unbounded" | undefined;
          readonly providers: readonly string[];
        }>;
      }
    | undefined;
  readonly providers?: readonly ProviderEvent[] | undefined;
  readonly result?:
    | {
        readonly suggestionCount: number;
        readonly errorCount: number;
      }
    | undefined;
  readonly accept?:
    | {
        readonly suggestionId: string;
        readonly suggestionProvider: string;
        readonly suggestionKind?: string | undefined;
        readonly resultIndex?: number | undefined;
        readonly resultCount?: number | undefined;
      }
    | undefined;
  readonly error?: { readonly message: string } | undefined;
  readonly sampling: SamplingDecision;
}

interface SamplingDecision {
  readonly keep: boolean;
  readonly reason: "always" | "error" | "slow" | "forced" | "sample" | "drop";
  readonly rate?: number | undefined;
}

interface RequestEventState {
  readonly requestId: string;
  readonly kind: RequestEventKind;
  readonly source: RequestEventSource;
  readonly method?: string | undefined;
  readonly path?: string | undefined;
  readonly startedAt: number;
  readonly traceId?: string | undefined;
  readonly spanId?: string | undefined;
  readonly strategy?: AddressStrategy | undefined;
  readonly query?: AddressQuery | undefined;
  readonly normalizedQuery?: AddressQuery | undefined;
  readonly queryHash?: string | undefined;
  readonly cacheKey?: string | undefined;
  readonly cache?: CacheEventUpdate | undefined;
  readonly plan?: WideEvent["plan"] | undefined;
  readonly providers: ProviderEvent[];
  readonly result?: WideEvent["result"] | undefined;
  readonly accept?: WideEvent["accept"] | undefined;
  readonly error?: { readonly message: string } | undefined;
  readonly forceSample?: boolean | undefined;
  readonly flushed?: boolean | undefined;
}

export interface FinalizedRequestEvent {
  readonly event: WideEvent;
  readonly decision: SamplingDecision;
}

export interface RequestEvent {
  readonly recordSuggest: (request: SuggestRequest) => Effect.Effect<void>;
  readonly recordAccept: (request: AcceptRequest) => Effect.Effect<void>;
  readonly recordCache: (update: CacheEventUpdate) => Effect.Effect<void>;
  readonly recordPlan: (
    plan: AddressProviderPlan<unknown>
  ) => Effect.Effect<void>;
  readonly recordProvider: (event: ProviderEvent) => Effect.Effect<void>;
  readonly recordResult: (
    result: AddressSuggestionResult
  ) => Effect.Effect<void>;
  readonly recordError: (message: string) => Effect.Effect<void>;
  readonly markImportant: () => Effect.Effect<void>;
  readonly finalize: (
    statusCode: number
  ) => Effect.Effect<FinalizedRequestEvent | undefined>;
  readonly flush: (
    statusCode: number
  ) => Effect.Effect<FinalizedRequestEvent | undefined>;
}

export const RequestEvent = Context.GenericTag<RequestEvent>("RequestEvent");

const clampSampleRate = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const summarizePlan = (
  plan: AddressProviderPlan<unknown>
): WideEvent["plan"] => ({
  stages: plan.stages.map((stage) => ({
    name: stage.name,
    concurrency: stage.concurrency ?? "unbounded",
    providers: stage.providers.map((provider) => provider.name),
  })),
});

const toIsoString = (timestampMs: number): string =>
  new Date(timestampMs).toISOString();

const mergeCache = (
  current: CacheEventUpdate | undefined,
  update: CacheEventUpdate
): CacheEventUpdate => ({
  ...(current ?? {}),
  ...update,
});

const hashQuery = (query: AddressQuery): string =>
  createHash("sha256").update(addressQueryKey(query)).digest("hex");

const decideSampling = (
  event: Omit<WideEvent, "sampling">,
  config: RequestEventConfig,
  random: () => number,
  forceSample: boolean | undefined
): SamplingDecision => {
  if (config.alwaysSample) {
    return { keep: true, reason: "always" };
  }
  if (event.error || event.statusCode >= 500) {
    return { keep: true, reason: "error" };
  }
  if (event.durationMs >= config.slowThresholdMs) {
    return { keep: true, reason: "slow" };
  }
  if (forceSample) {
    return { keep: true, reason: "forced" };
  }
  const rate = clampSampleRate(config.sampleRate);
  if (rate >= 1) {
    return { keep: true, reason: "always", rate: 1 };
  }
  const keep = random() < rate;
  return keep
    ? { keep, reason: "sample", rate }
    : { keep, reason: "drop", rate };
};

const compactAttributes = (values: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );

const sanitizeServerTimingToken = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_.-]/g, "_");

const formatServerTimingDuration = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return `${Math.max(0, Math.round(value))}`;
};

const formatServerTiming = (event: WideEvent): string | undefined => {
  const entries: string[] = [];
  entries.push(`total;dur=${formatServerTimingDuration(event.durationMs)}`);

  const cacheParts: string[] = [];
  if (event.cache?.l1) {
    cacheParts.push(`l1=${event.cache.l1}`);
  }
  if (event.cache?.l2) {
    cacheParts.push(`l2=${event.cache.l2}`);
  }
  if (event.cache?.stale) {
    cacheParts.push("stale");
  }
  if (event.cache?.revalidated) {
    cacheParts.push("revalidated");
  }
  if (cacheParts.length > 0) {
    entries.push(`cache;desc="${cacheParts.join(" ")}"`);
  }

  const providerDurations = new Map<string, number>();
  for (const provider of event.providers ?? []) {
    const token = sanitizeServerTimingToken(`provider.${provider.provider}`);
    providerDurations.set(
      token,
      (providerDurations.get(token) ?? 0) + provider.durationMs
    );
  }
  for (const [token, durationMs] of providerDurations.entries()) {
    entries.push(`${token};dur=${formatServerTimingDuration(durationMs)}`);
  }

  return entries.length > 0 ? entries.join(", ") : undefined;
};

export const serverTimingHeader = (
  finalized: FinalizedRequestEvent | undefined
): string | undefined =>
  finalized ? formatServerTiming(finalized.event) : undefined;

export const makeRequestId = (): string => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return `req_${cryptoApi.randomUUID()}`;
  }
  const random = Math.random().toString(16).slice(2);
  const timestamp = Date.now().toString(16);
  return `req_${random}${timestamp}`;
};

export const makeRequestEvent = (init: RequestEventInit) =>
  Effect.gen(function* () {
    const config = yield* RequestEventConfig;
    const startedAt = yield* currentTimeMillis;
    const initialSpan = yield* Effect.option(Effect.currentSpan);
    const initialTraceId = Option.getOrUndefined(
      Option.map(initialSpan, (value) => value.traceId)
    );
    const initialSpanId = Option.getOrUndefined(
      Option.map(initialSpan, (value) => value.spanId)
    );
    const state = yield* Ref.make<RequestEventState>({
      requestId: init.requestId,
      kind: init.kind,
      source: init.source,
      method: init.method,
      path: init.path,
      startedAt,
      traceId: initialTraceId,
      spanId: initialSpanId,
      providers: [],
    });

    const baseRequestUpdate = (request: SuggestRequest | AcceptRequest) => {
      const normalized = normalizeAddressQuery(request.query);
      const queryHash = hashQuery(normalized);
      return {
        strategy: request.strategy,
        ...(config.logRawQuery ? { query: request.query } : {}),
        normalizedQuery: normalized,
        queryHash,
        cacheKey: `${request.strategy}:${addressQueryKey(normalized)}`,
      };
    };

    const recordSuggest = (request: SuggestRequest) =>
      Ref.update(state, (current) => {
        return {
          ...current,
          ...baseRequestUpdate(request),
        };
      });

    const recordAccept = (request: AcceptRequest) =>
      Ref.update(state, (current) => {
        return {
          ...current,
          ...baseRequestUpdate(request),
          accept: {
            suggestionId: request.suggestion.id,
            suggestionProvider: request.suggestion.source.provider,
            suggestionKind: request.suggestion.source.kind,
            resultIndex: request.resultIndex,
            resultCount: request.resultCount,
          },
        };
      });

    const recordCache = (update: CacheEventUpdate) =>
      Ref.update(state, (current) => ({
        ...current,
        cache: mergeCache(current.cache, update),
      }));

    const recordPlan = (plan: AddressProviderPlan<unknown>) =>
      Ref.update(state, (current) => ({
        ...current,
        plan: summarizePlan(plan),
      }));

    const recordProvider = (event: ProviderEvent) =>
      Ref.update(state, (current) => ({
        ...current,
        providers: [...current.providers, event],
      }));

    const recordResult = (result: AddressSuggestionResult) =>
      Ref.update(state, (current) => ({
        ...current,
        result: {
          suggestionCount: result.suggestions.length,
          errorCount: result.errors.length,
        },
      }));

    const recordError = (message: string) =>
      Ref.update(state, (current) => ({
        ...current,
        error: { message },
      }));

    const markImportant = () =>
      Ref.update(state, (current) => ({ ...current, forceSample: true }));

    const finalize = (statusCode: number) =>
      Effect.gen(function* () {
        const now = yield* currentTimeMillis;
        const span = yield* Effect.option(Effect.currentSpan);
        const traceFromSpan = Option.getOrUndefined(
          Option.map(span, (value) => value.traceId)
        );
        const spanFromSpan = Option.getOrUndefined(
          Option.map(span, (value) => value.spanId)
        );
        const snapshot = yield* Ref.modify(state, (current) => {
          if (current.flushed) {
            return [Option.none<FinalizedRequestEvent>(), current] as const;
          }
          const traceId = traceFromSpan ?? current.traceId;
          const spanId = spanFromSpan ?? current.spanId;
          const durationMs = Math.max(0, now - current.startedAt);
          const eventBase = {
            timestamp: toIsoString(now),
            requestId: current.requestId,
            traceId,
            spanId,
            kind: current.kind,
            source: current.source,
            service: config.serviceName,
            version: config.serviceVersion,
            method: current.method,
            path: current.path,
            statusCode,
            durationMs,
            strategy: current.strategy,
            query: current.query,
            normalizedQuery: current.normalizedQuery,
            queryHash: current.queryHash,
            cacheKey: current.cacheKey,
            cache: current.cache,
            plan: current.plan,
            providers:
              current.providers.length > 0 ? current.providers : undefined,
            result: current.result,
            accept: current.accept,
            error: current.error,
          } as const;
          const random = config.random ?? Math.random;
          const decision = decideSampling(
            eventBase,
            config,
            random,
            current.forceSample
          );
          const event: WideEvent = {
            ...eventBase,
            sampling: decision,
          };
          const finalized: FinalizedRequestEvent = { event, decision };
          return [
            Option.some(finalized),
            { ...current, flushed: true },
          ] as const;
        });

        return Option.getOrUndefined(snapshot);
      });

    const flush = (statusCode: number) =>
      finalize(statusCode).pipe(
        Effect.flatMap((finalized) => {
          if (!finalized) {
            return Effect.succeed(undefined);
          }
          if (!finalized.decision.keep) {
            return Effect.succeed(finalized);
          }
          const event = finalized.event;
          const attributes = compactAttributes({
            "request.id": event.requestId,
            "request.kind": event.kind,
            "request.source": event.source,
            "http.method": event.method,
            "http.route": event.path,
            "response.status_code": event.statusCode,
            "response.duration_ms": event.durationMs,
            "address.strategy": event.strategy,
            "address.suggestions": event.result?.suggestionCount,
            "address.errors": event.result?.errorCount,
            "cache.l1": event.cache?.l1,
            "cache.l2": event.cache?.l2,
            "event.sample.reason": event.sampling.reason,
            "event.sample.rate": event.sampling.rate,
          });

          return Effect.annotateCurrentSpan(attributes).pipe(
            Effect.zipRight(Effect.logInfo(event)),
            Effect.as(finalized)
          );
        })
      );

    return {
      recordSuggest,
      recordAccept,
      recordCache,
      recordPlan,
      recordProvider,
      recordResult,
      recordError,
      markImportant,
      finalize,
      flush,
    };
  });
