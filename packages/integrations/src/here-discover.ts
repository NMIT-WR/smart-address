import { Effect } from "effect"
import * as Clock from "effect/Clock"
import * as Schema from "effect/Schema"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as UrlParams from "@effect/platform/UrlParams"
import {
  makeAddressProvider,
  normalizeAddressQuery,
  type AddressQuery,
  type AddressSuggestion
} from "@smart-address/core"

export type HereDiscoverConfig = {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly defaultLimit?: number
  readonly language?: string
  readonly inArea?: string
  readonly at?: string | { lat: number; lng: number }
}

const HerePositionSchema = Schema.Struct({
  lat: Schema.Number,
  lng: Schema.Number
})

const HereCategorySchema = Schema.Struct({
  id: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  primary: Schema.optional(Schema.Boolean)
})

const HereScoringSchema = Schema.Struct({
  queryScore: Schema.optional(Schema.Number)
})

const HereAddressSchema = Schema.Struct({
  label: Schema.optional(Schema.String),
  houseNumber: Schema.optional(Schema.String),
  street: Schema.optional(Schema.String),
  district: Schema.optional(Schema.String),
  subdistrict: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  county: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  stateCode: Schema.optional(Schema.String),
  postalCode: Schema.optional(Schema.String),
  countryCode: Schema.optional(Schema.String),
  countryName: Schema.optional(Schema.String)
})

const HereItemSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  address: Schema.optional(HereAddressSchema),
  position: Schema.optional(HerePositionSchema),
  categories: Schema.optional(Schema.Array(HereCategorySchema)),
  resultType: Schema.optional(Schema.String),
  scoring: Schema.optional(HereScoringSchema),
  distance: Schema.optional(Schema.Number)
})

const HereDiscoverResponseSchema = Schema.Struct({
  items: Schema.Array(HereItemSchema)
})

type HereAddress = Schema.Schema.Type<typeof HereAddressSchema>
type HereCategory = Schema.Schema.Type<typeof HereCategorySchema>
type HereItem = Schema.Schema.Type<typeof HereItemSchema>

const addressFromHere = (address: HereAddress | undefined) => {
  if (!address) {
    return {}
  }

  const line1 =
    [address.houseNumber, address.street].map((value) => value?.trim()).filter(Boolean).join(" ") ||
    undefined
  const line2 = [address.district, address.subdistrict].map((value) => value?.trim()).find(Boolean)
  const city = [address.city, address.county].map((value) => value?.trim()).find(Boolean)
  const region = [address.state, address.stateCode].map((value) => value?.trim()).find(Boolean)
  const postalCode = address.postalCode?.trim() || undefined
  const countryCode = (address.countryCode?.trim() || undefined)?.toUpperCase()

  return {
    line1,
    line2,
    city,
    region,
    postalCode,
    countryCode
  }
}

const metadataFromHere = (item: HereItem): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {}

  if (item.position) {
    metadata.lat = String(item.position.lat)
    metadata.lng = String(item.position.lng)
  }

  if (item.resultType) {
    metadata.resultType = item.resultType
  }

  if (typeof item.distance === "number") {
    metadata.distance = String(item.distance)
  }

  const category = item.categories?.find((entry) => entry.primary) ?? item.categories?.[0]
  if (category?.id) {
    metadata.categoryId = category.id
  }
  if (category?.name) {
    metadata.categoryName = category.name
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const formatAt = (value: HereDiscoverConfig["at"]): string | undefined => {
  if (!value) {
    return undefined
  }
  if (typeof value === "string") {
    return value.trim() || undefined
  }
  return `${value.lat},${value.lng}`
}

const toAddressSuggestion = (item: HereItem): AddressSuggestion => ({
  id: `here-discover:${item.id}`,
  label: item.address?.label ?? item.title,
  address: addressFromHere(item.address),
  score: item.scoring?.queryScore,
  source: {
    provider: "here-discover",
    kind: "public",
    reference: item.id
  },
  metadata: metadataFromHere(item)
})

export const parseHereDiscoverResponse = (body: unknown) =>
  Schema.decodeUnknown(HereDiscoverResponseSchema)(body).pipe(
    Effect.map((response) => response.items.map(toAddressSuggestion))
  )

const buildRequest = (config: HereDiscoverConfig, query: AddressQuery): HttpClientRequest.HttpClientRequest => {
  const baseUrl = config.baseUrl ?? "https://discover.search.hereapi.com"
  const normalized = normalizeAddressQuery(query)
  const limit = normalized.limit ?? config.defaultLimit ?? 5
  const language = normalized.locale ?? config.language
  const inAreaFromQuery =
    normalized.countryCode && normalized.countryCode.length === 3
      ? `countryCode:${normalized.countryCode}`
      : undefined
  const inArea = inAreaFromQuery ?? config.inArea
  const at = formatAt(config.at)

  const params: Record<string, string> = {
    q: normalized.text,
    apiKey: config.apiKey
  }

  params.limit = String(limit)

  if (language) {
    params.lang = language
  }

  if (inArea) {
    params.in = inArea
  }

  if (at) {
    params.at = at
  }

  return HttpClientRequest.get(new URL("/v1/discover", baseUrl), {
    urlParams: params,
    acceptJson: true
  })
}

export const makeHereDiscoverProvider = (config: HereDiscoverConfig) =>
  makeAddressProvider("here-discover", (query) => {
    const request = buildRequest(config, query)
    const params = UrlParams.toRecord(request.urlParams)

    return Effect.gen(function* () {
      const start = yield* Clock.currentTimeMillis
      yield* Effect.logInfo("here-discover request", {
        url: request.url,
        params,
        query
      })

      const response = yield* HttpClient.execute(request)
      const elapsedMs = (yield* Clock.currentTimeMillis) - start

      yield* Effect.logInfo("here-discover response", {
        status: response.status,
        elapsedMs,
        headers: response.headers
      })

      if (response.status < 200 || response.status >= 300) {
        const body = yield* response.text
        yield* Effect.logError("here-discover response error", {
          status: response.status,
          elapsedMs,
          body
        })
        return yield* Effect.fail(new Error(`HERE discover failed: ${response.status}`))
      }

      const body = yield* response.json
      yield* Effect.logInfo("here-discover response body", body)

      return yield* parseHereDiscoverResponse(body).pipe(
        Effect.tapError((error) => Effect.logError("here-discover parse error", error))
      )
    }).pipe(
      Effect.withSpan("here-discover.request", {
        attributes: {
          url: request.url,
          params,
          provider: "here-discover"
        }
      }),
      Effect.onInterrupt(() => Effect.logWarning("here-discover request interrupted"))
    )
  })
