import { Context, Effect, Layer } from "effect"
import * as Duration from "effect/Duration"
import {
  makeAddressSuggestionService,
  withProviderTimeout,
  type AddressProviderPlan,
  type AddressSuggestionResult,
  type AddressSuggestionService
} from "@smart-address/core"
import { makeNominatimProvider, type NominatimConfig } from "@smart-address/integrations/nominatim"
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
}

const makePlan = (
  provider: ReturnType<typeof makeNominatimProvider>,
  name: string
): AddressProviderPlan<HttpClient.HttpClient> => ({
  stages: [
    {
      name,
      providers: [provider],
      concurrency: 1
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
      const baseProvider = withProviderTimeout(makeNominatimProvider(config.nominatim), timeout)
      const rateLimit =
        config.nominatimRateLimit === null ? null : config.nominatimRateLimit ?? Duration.seconds(1)
      const limiter = rateLimit ? yield* makeAddressRateLimiter(rateLimit) : null
      const provider = limiter ? withRateLimiter(baseProvider, limiter) : baseProvider
      const fastPlan = makePlan(provider, "public-fast")
      const reliablePlan = makePlan(provider, "public-reliable")
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
