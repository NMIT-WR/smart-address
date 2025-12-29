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
import { makeNominatimProvider, type NominatimConfig } from "@smart-address/integrations/nominatim"
import { makeHereProvider, type HereConfig } from "@smart-address/integrations/here"
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
  readonly here: HereConfig | undefined
  readonly providerTimeout?: Duration.DurationInput
  readonly nominatimRateLimit?: Duration.DurationInput | null
  readonly hereRateLimit?: Duration.DurationInput | null
}

const makePlan = (
  providers: ReadonlyArray<AddressProvider<HttpClient.HttpClient>>,
  name: string
): AddressProviderPlan<HttpClient.HttpClient> => ({
  stages: [
    {
      name,
      providers,
      concurrency: "unbounded"
    }
  ]
})

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
      const providers: Array<AddressProvider<HttpClient.HttpClient>> = []

      const baseNominatim = withProviderTimeout(makeNominatimProvider(config.nominatim), timeout)
      const nominatimRateLimit =
        config.nominatimRateLimit === null ? null : config.nominatimRateLimit ?? Duration.seconds(1)
      const nominatimLimiter = nominatimRateLimit ? yield* makeAddressRateLimiter(nominatimRateLimit) : null
      const nominatimProvider = nominatimLimiter ? withRateLimiter(baseNominatim, nominatimLimiter) : baseNominatim
      providers.push(nominatimProvider)

      if (config.here) {
        const baseHere = withProviderTimeout(makeHereProvider(config.here), timeout)
        const hereRateLimit = config.hereRateLimit === null ? null : config.hereRateLimit
        const hereLimiter = hereRateLimit ? yield* makeAddressRateLimiter(hereRateLimit) : null
        const hereProvider = hereLimiter ? withRateLimiter(baseHere, hereLimiter) : baseHere
        providers.push(hereProvider)
      }

      const fastPlan = makePlan(providers, "public-fast")
      const reliablePlan = makePlan(providers, "public-reliable")
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
