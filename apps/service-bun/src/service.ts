import { Context, Effect, Layer } from "effect"
import * as Duration from "effect/Duration"
import {
  makeAddressSuggestionService,
  withProviderTimeout,
  type AddressProvider,
  type AddressProviderPlan,
  type AddressSuggestionResult,
  type AddressSuggestionService
} from "@smart-address/core"
import { makeHereDiscoverProvider, type HereDiscoverConfig } from "@smart-address/integrations/here-discover"
import { makeNominatimProvider, type NominatimConfig } from "@smart-address/integrations/nominatim"
import {
  makeRadarAutocompleteProvider,
  type RadarAutocompleteConfig
} from "@smart-address/integrations/radar-autocomplete"
import { makeAddressRateLimiter, withRateLimiter } from "@smart-address/integrations/rate-limit"
import type * as HttpClient from "@effect/platform/HttpClient"
import type { SuggestRequest } from "./request"

export interface AddressSuggestor {
  readonly suggest: (
    request: SuggestRequest
  ) => Effect.Effect<AddressSuggestionResult, never, HttpClient.HttpClient>
}

export const AddressSuggestor = Context.GenericTag<AddressSuggestor>("AddressSuggestor")

export type AddressSuggestorConfig = {
  readonly nominatim: NominatimConfig
  readonly providerTimeout?: Duration.DurationInput
  readonly nominatimRateLimit?: Duration.DurationInput | null
  readonly radarAutocomplete?: RadarAutocompleteConfig | null
  readonly radarAutocompleteRateLimit?: Duration.DurationInput | null
  readonly hereDiscover?: HereDiscoverConfig | null
  readonly hereDiscoverRateLimit?: Duration.DurationInput | null
}

type HttpAddressProvider = AddressProvider<HttpClient.HttpClient>

const makePlan = (
  providers: ReadonlyArray<HttpAddressProvider>,
  name: string
): AddressProviderPlan<HttpClient.HttpClient> => ({
  stages: [
    {
      name,
      providers,
      concurrency: 1
    }
  ]
})

const makeSequentialPlan = (
  providers: ReadonlyArray<HttpAddressProvider>,
  name: string
): AddressProviderPlan<HttpClient.HttpClient> => ({
  stages: providers.map((provider, index) => ({
    name: index === 0 ? name : `${name}-fallback${index === 1 ? "" : `-${index}`}`,
    providers: [provider],
    concurrency: 1
  }))
})

const withOptionalRateLimit = <R>(
  provider: AddressProvider<R>,
  rateLimit: Duration.DurationInput | null
): Effect.Effect<AddressProvider<R>> =>
  rateLimit
    ? makeAddressRateLimiter(rateLimit).pipe(Effect.map((limiter) => withRateLimiter(provider, limiter)))
    : Effect.succeed(provider)

const makeService = (
  plan: AddressProviderPlan<HttpClient.HttpClient>
): AddressSuggestionService<HttpClient.HttpClient> =>
  makeAddressSuggestionService(plan, { stopAtLimit: true })

const sortSuggestionsByScore = (result: AddressSuggestionResult): AddressSuggestionResult => {
  if (result.suggestions.length < 2) {
    return result
  }
  const sorted = [...result.suggestions].sort(
    (left, right) => (right.score ?? -1) - (left.score ?? -1)
  )
  return { ...result, suggestions: sorted }
}

export const AddressSuggestorLayer = (config: AddressSuggestorConfig) =>
  Layer.effect(
    AddressSuggestor,
    Effect.gen(function* () {
      const timeout = config.providerTimeout ?? Duration.seconds(4)
      const baseNominatim = withProviderTimeout(makeNominatimProvider(config.nominatim), timeout)
      const nominatimRateLimit =
        config.nominatimRateLimit === null ? null : config.nominatimRateLimit ?? Duration.seconds(1)
      const nominatimProvider = yield* withOptionalRateLimit(baseNominatim, nominatimRateLimit)

      const radarProvider = config.radarAutocomplete
        ? yield* withOptionalRateLimit(
            withProviderTimeout(makeRadarAutocompleteProvider(config.radarAutocomplete), timeout),
            config.radarAutocompleteRateLimit ?? null
          )
        : null

      const hereProvider = config.hereDiscover
        ? yield* withOptionalRateLimit(
            withProviderTimeout(makeHereDiscoverProvider(config.hereDiscover), timeout),
            config.hereDiscoverRateLimit ?? null
          )
        : null

      const providers = [radarProvider, hereProvider, nominatimProvider].filter(
        (provider): provider is HttpAddressProvider => provider !== null
      )
      const fastPlan = makePlan([providers[0] ?? nominatimProvider], "public-fast")
      const reliablePlan = makeSequentialPlan(providers, "public-reliable")
      const fastService = makeService(fastPlan)
      const reliableService = makeService(reliablePlan)

      return {
        suggest: (request) =>
          (request.strategy === "fast" ? fastService.suggest(request.query) : reliableService.suggest(request.query)).pipe(
            Effect.map(sortSuggestionsByScore)
          )
      }
    })
  )
