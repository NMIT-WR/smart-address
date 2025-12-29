import { Effect } from "effect"
import * as Schema from "effect/Schema"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
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
  readonly showDetails?: boolean
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

const compactString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const firstNonEmpty = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    const compacted = compactString(value)
    if (compacted) {
      return compacted
    }
  }
  return undefined
}

const joinParts = (first?: string, second?: string): string | undefined => {
  const left = compactString(first)
  const right = compactString(second)
  if (left && right) {
    return `${left} ${right}`
  }
  return left ?? right
}

const addressFromHere = (address: HereAddress | undefined) => {
  if (!address) {
    return {}
  }

  const line1 = joinParts(address.houseNumber, address.street) ?? address.street
  const line2 = firstNonEmpty(address.district, address.subdistrict)
  const city = firstNonEmpty(address.city, address.county)
  const region = firstNonEmpty(address.state, address.stateCode)
  const postalCode = compactString(address.postalCode)
  const countryCode = compactString(address.countryCode)?.toUpperCase()

  return {
    line1,
    line2,
    city,
    region,
    postalCode,
    countryCode
  }
}

const selectCategory = (categories: ReadonlyArray<HereCategory> | undefined) => {
  if (!categories || categories.length === 0) {
    return undefined
  }
  return categories.find((category) => category.primary) ?? categories[0]
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

  const category = selectCategory(item.categories)
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
    return compactString(value)
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
  const inArea = normalized.countryCode ? `countryCode:${normalized.countryCode}` : config.inArea
  const at = formatAt(config.at)

  const params: Record<string, string> = {
    q: normalized.text,
    apiKey: config.apiKey
  }

  params.limit = String(limit)

  if (config.showDetails) {
    params.show = "details"
  }

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
  makeAddressProvider("here-discover", (query) =>
    HttpClient.execute(buildRequest(config, query)).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap((response) => response.json),
      Effect.flatMap(parseHereDiscoverResponse)
    )
  )
