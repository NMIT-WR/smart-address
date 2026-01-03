import type { HttpClient } from "@effect/platform/HttpClient";
import {
  type AddressProvider,
  type AddressProviderPlan,
  type AddressSuggestionResult,
  type AddressSuggestionService,
  makeAddressSuggestionService,
  withProviderTimeout,
} from "@smart-address/core";
import {
  type HereDiscoverConfig,
  makeHereDiscoverProvider,
} from "@smart-address/integrations/here-discover";
import {
  makeNominatimProvider,
  type NominatimConfig,
} from "@smart-address/integrations/nominatim";
import {
  makeRadarAutocompleteProvider,
  type RadarAutocompleteConfig,
} from "@smart-address/integrations/radar-autocomplete";
import {
  makeAddressRateLimiter,
  withRateLimiter,
} from "@smart-address/integrations/rate-limit";
import { Context, Effect, Exit, Layer } from "effect";
import { currentTimeMillis } from "effect/Clock";
import { type DurationInput, seconds } from "effect/Duration";
import { AddressMetrics } from "./metrics";
import type { SuggestRequest } from "./request";

export interface AddressSuggestor {
  readonly suggest: (
    request: SuggestRequest
  ) => Effect.Effect<AddressSuggestionResult, never, HttpClient>;
}

export const AddressSuggestor =
  Context.GenericTag<AddressSuggestor>("AddressSuggestor");
interface AddressSuggestorConfig {
  readonly nominatim: NominatimConfig;
  readonly providerTimeout?: DurationInput;
  readonly nominatimRateLimit?: DurationInput | null;
  readonly radarAutocomplete?: RadarAutocompleteConfig | null;
  readonly radarAutocompleteRateLimit?: DurationInput | null;
  readonly hereDiscover?: HereDiscoverConfig | null;
  readonly hereDiscoverRateLimit?: DurationInput | null;
}

type HttpAddressProvider = AddressProvider<HttpClient>;

const makePlan = (
  providers: readonly HttpAddressProvider[],
  name: string
): AddressProviderPlan<HttpClient> => ({
  stages: [
    {
      name,
      providers,
      concurrency: 1,
    },
  ],
});

const makeSequentialPlan = (
  providers: readonly HttpAddressProvider[],
  name: string
): AddressProviderPlan<HttpClient> => ({
  stages: providers.map((provider, index) => ({
    name: index === 0 ? name : `${name}-fallback-${index}`,
    providers: [provider],
    concurrency: 1,
  })),
});

const withOptionalRateLimit = <R>(
  provider: AddressProvider<R>,
  rateLimit: DurationInput | null
): Effect.Effect<AddressProvider<R>> =>
  rateLimit
    ? makeAddressRateLimiter(rateLimit).pipe(
        Effect.map((limiter) => withRateLimiter(provider, limiter))
      )
    : Effect.succeed(provider);

const withProviderMetrics = <R>(
  provider: AddressProvider<R>,
  metrics: AddressMetrics
): AddressProvider<R> => ({
  name: provider.name,
  suggest: (query) =>
    Effect.gen(function* () {
      const start = yield* currentTimeMillis;
      const exit = yield* Effect.exit(provider.suggest(query));
      const durationMs = (yield* currentTimeMillis) - start;
      yield* metrics
        .recordProvider({
          provider: provider.name,
          durationMs,
          ok: Exit.isSuccess(exit),
        })
        .pipe(Effect.catchAll(() => Effect.void));
      return yield* Effect.done(exit);
    }),
});

const makeService = (
  plan: AddressProviderPlan<HttpClient>
): AddressSuggestionService<HttpClient> =>
  makeAddressSuggestionService(plan, { stopAtLimit: true });

const sortSuggestionsByScore = (
  result: AddressSuggestionResult
): AddressSuggestionResult => {
  if (result.suggestions.length < 2) {
    return result;
  }
  const sorted = [...result.suggestions].sort(
    (left, right) => (right.score ?? -1) - (left.score ?? -1)
  );
  return { ...result, suggestions: sorted };
};

export const AddressSuggestorLayer = (config: AddressSuggestorConfig) =>
  Layer.effect(
    AddressSuggestor,
    Effect.gen(function* () {
      const metrics = yield* AddressMetrics;
      const timeout = config.providerTimeout ?? seconds(4);
      const applyMetrics = <R>(provider: AddressProvider<R>) =>
        withProviderMetrics(provider, metrics);
      const baseNominatim = withProviderTimeout(
        makeNominatimProvider(config.nominatim),
        timeout
      );
      const nominatimRateLimit =
        config.nominatimRateLimit === null
          ? null
          : (config.nominatimRateLimit ?? seconds(1));
      const nominatimProvider = yield* withOptionalRateLimit(
        baseNominatim,
        nominatimRateLimit
      ).pipe(Effect.map(applyMetrics));

      const radarProvider = config.radarAutocomplete
        ? yield* withOptionalRateLimit(
            withProviderTimeout(
              makeRadarAutocompleteProvider(config.radarAutocomplete),
              timeout
            ),
            config.radarAutocompleteRateLimit ?? null
          ).pipe(Effect.map(applyMetrics))
        : null;

      const hereProvider = config.hereDiscover
        ? yield* withOptionalRateLimit(
            withProviderTimeout(
              makeHereDiscoverProvider(config.hereDiscover),
              timeout
            ),
            config.hereDiscoverRateLimit ?? null
          ).pipe(Effect.map(applyMetrics))
        : null;

      const providers = [radarProvider, hereProvider, nominatimProvider].filter(
        (provider): provider is HttpAddressProvider => provider !== null
      );
      const fastPlan = makePlan(
        [providers[0] ?? nominatimProvider],
        "public-fast"
      );
      const reliablePlan = makeSequentialPlan(providers, "public-reliable");
      const fastService = makeService(fastPlan);
      const reliableService = makeService(reliablePlan);

      return {
        suggest: (request) =>
          (request.strategy === "fast"
            ? fastService.suggest(request.query)
            : reliableService.suggest(request.query)
          ).pipe(Effect.map(sortSuggestionsByScore)),
      };
    })
  );
