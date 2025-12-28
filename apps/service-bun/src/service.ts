import { Effect } from "effect"
import * as Duration from "effect/Duration"
import {
  makeAddressSuggestionService,
  withProviderTimeout,
  type AddressProvider,
  type AddressProviderPlan,
  type AddressSuggestion,
  type AddressSuggestionService
} from "@smart-address/core"
import { makeHereProvider, type HereConfig } from "@smart-address/integrations/here"
import { makeNominatimProvider, type NominatimConfig } from "@smart-address/integrations/nominatim"
import { makeRadarProvider, type RadarConfig } from "@smart-address/integrations/radar"
import { makeAddressRateLimiter, withRateLimiter } from "@smart-address/integrations/rate-limit"
import type * as HttpClient from "@effect/platform/HttpClient"
import type { SuggestRequest } from "./request"

export type AddressSuggestorConfig = {
  readonly nominatim: NominatimConfig
  readonly here?: HereConfig
  readonly radar?: RadarConfig
  readonly providerTimeout?: Duration.DurationInput
  readonly nominatimRateLimit?: Duration.DurationInput | null
  readonly providerOrder?: ReadonlyArray<string>
}

const defaultProviderOrder = ["here", "radar", "nominatim"]

const normalizeKeyPart = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim().toLowerCase()
  return trimmed.length === 0 ? undefined : trimmed.replace(/\s+/g, " ")
}

const parseCoordinate = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const roundCoordinate = (value: number): string => {
  const rounded = Math.round(value * 10000) / 10000
  return String(rounded)
}

const coordinateKey = (metadata: AddressSuggestion["metadata"]): string | undefined => {
  if (!metadata) {
    return undefined
  }
  const lat = parseCoordinate(metadata.lat)
  const lon = parseCoordinate(metadata.lon ?? metadata.lng)
  if (lat === undefined || lon === undefined) {
    return undefined
  }
  return `${roundCoordinate(lat)},${roundCoordinate(lon)}`
}

const addressDedupeKey = (suggestion: AddressSuggestion): string => {
  const address = suggestion.address
  const parts = [
    suggestion.label,
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postalCode,
    address.countryCode
  ]
    .map(normalizeKeyPart)
    .filter((value): value is string => Boolean(value))

  const coords = coordinateKey(suggestion.metadata)
  if (coords) {
    parts.push(coords)
  }

  if (parts.length === 0) {
    return suggestion.id
  }

  return parts.join("|")
}

const makePlan = (
  providers: ReadonlyArray<AddressProvider<HttpClient.HttpClient>>,
  name: string
): AddressProviderPlan<HttpClient.HttpClient> => ({
  stages: providers.map((provider) => ({
    name: `${name}:${provider.name}`,
    providers: [provider],
    concurrency: 1
  }))
})

const makeService = (
  plan: AddressProviderPlan<HttpClient.HttpClient>,
  stopAtLimit: boolean
): AddressSuggestionService<HttpClient.HttpClient> =>
  makeAddressSuggestionService(plan, { stopAtLimit, dedupeKey: addressDedupeKey })

const resolveProviderOrder = (
  providerOrder: ReadonlyArray<string> | undefined,
  providers: Map<string, AddressProvider<HttpClient.HttpClient>>
): ReadonlyArray<AddressProvider<HttpClient.HttpClient>> => {
  const normalizeName = (name: string) => name.trim().toLowerCase()
  const order = (providerOrder && providerOrder.length > 0 ? providerOrder : defaultProviderOrder).map(normalizeName)
  const resolved = order
    .map((name) => providers.get(name))
    .filter((provider): provider is AddressProvider<HttpClient.HttpClient> => Boolean(provider))

  if (resolved.length > 0) {
    return resolved
  }

  return defaultProviderOrder
    .map((name) => providers.get(name))
    .filter((provider): provider is AddressProvider<HttpClient.HttpClient> => Boolean(provider))
}

const buildAddressSuggestor = (config: AddressSuggestorConfig) =>
  Effect.gen(function* () {
    const timeout = config.providerTimeout ?? Duration.seconds(4)
    const providers = new Map<string, AddressProvider<HttpClient.HttpClient>>()
    const rateLimit = config.nominatimRateLimit === null ? null : config.nominatimRateLimit ?? Duration.seconds(1)
    const limiter = rateLimit ? yield* makeAddressRateLimiter(rateLimit) : null
    const baseNominatim = withProviderTimeout(makeNominatimProvider(config.nominatim), timeout)
    const nominatim = limiter ? withRateLimiter(baseNominatim, limiter) : baseNominatim

    providers.set("nominatim", nominatim)

    if (config.here) {
      providers.set("here", withProviderTimeout(makeHereProvider(config.here), timeout))
    }

    if (config.radar) {
      providers.set("radar", withProviderTimeout(makeRadarProvider(config.radar), timeout))
    }

    const orderedProviders = resolveProviderOrder(config.providerOrder, providers)
    const fastProviders = orderedProviders.slice(0, 1)
    const fastPlan = makePlan(fastProviders, "public-fast")
    const reliablePlan = makePlan(orderedProviders, "public-reliable")
    const fastService = makeService(fastPlan, true)
    const reliableService = makeService(reliablePlan, false)

    return {
      suggest: (request: SuggestRequest) =>
        request.strategy === "fast" ? fastService.suggest(request.query) : reliableService.suggest(request.query)
    }
  })

export class AddressSuggestor extends Effect.Service<AddressSuggestor>()(
  "@smart-address/service-bun/AddressSuggestor",
  { effect: buildAddressSuggestor }
) {}
