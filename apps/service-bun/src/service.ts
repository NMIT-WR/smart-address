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
  makeAddressRateLimiter,
  withRateLimiter,
} from "@smart-address/integrations/rate-limit";
import { Context, Effect, Layer } from "effect";
import { type DurationInput, seconds } from "effect/Duration";
import type { SuggestRequest } from "./request";

export interface AddressSuggestor {
  readonly suggest: (
    request: SuggestRequest
  ) => Effect.Effect<AddressSuggestionResult, never, HttpClient>;
}

export const AddressSuggestor =
  Context.GenericTag<AddressSuggestor>("AddressSuggestor");

export interface AddressSuggestorConfig {
  readonly nominatim: NominatimConfig;
  readonly providerTimeout?: DurationInput;
  readonly nominatimRateLimit?: DurationInput | null;
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

const makeFallbackPlan = (
  primary: HttpAddressProvider,
  fallback: HttpAddressProvider,
  name: string
): AddressProviderPlan<HttpClient> => ({
  stages: [
    {
      name,
      providers: [primary],
      concurrency: 1,
    },
    {
      name: `${name}-fallback`,
      providers: [fallback],
      concurrency: 1,
    },
  ],
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
      const timeout = config.providerTimeout ?? seconds(4);
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
      );

      const hereProvider = config.hereDiscover
        ? yield* withOptionalRateLimit(
            withProviderTimeout(
              makeHereDiscoverProvider(config.hereDiscover),
              timeout
            ),
            config.hereDiscoverRateLimit ?? null
          )
        : null;

      const fastProvider = hereProvider ?? nominatimProvider;
      const fastPlan = makePlan([fastProvider], "public-fast");
      const reliablePlan = hereProvider
        ? makeFallbackPlan(hereProvider, nominatimProvider, "public-reliable")
        : makePlan([nominatimProvider], "public-reliable");
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
