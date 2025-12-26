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

export type NominatimConfig = {
  readonly baseUrl?: string
  readonly userAgent: string
  readonly email?: string
  readonly referer?: string
  readonly defaultLimit?: number
}

const NominatimAddressSchema = Schema.Struct({
  house_number: Schema.optional(Schema.String),
  road: Schema.optional(Schema.String),
  neighbourhood: Schema.optional(Schema.String),
  suburb: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  town: Schema.optional(Schema.String),
  village: Schema.optional(Schema.String),
  hamlet: Schema.optional(Schema.String),
  municipality: Schema.optional(Schema.String),
  county: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  state_district: Schema.optional(Schema.String),
  region: Schema.optional(Schema.String),
  province: Schema.optional(Schema.String),
  postcode: Schema.optional(Schema.String),
  country_code: Schema.optional(Schema.String)
})

const NominatimResultSchema = Schema.Struct({
  place_id: Schema.Union(Schema.Number, Schema.NumberFromString),
  osm_type: Schema.String,
  osm_id: Schema.Union(Schema.Number, Schema.NumberFromString),
  lat: Schema.String,
  lon: Schema.String,
  display_name: Schema.String,
  importance: Schema.optional(Schema.Number),
  class: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
  address: Schema.optional(NominatimAddressSchema)
})

const NominatimResponseSchema = Schema.Array(NominatimResultSchema)

type NominatimResult = Schema.Schema.Type<typeof NominatimResultSchema>
type NominatimAddress = Schema.Schema.Type<typeof NominatimAddressSchema>

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

const addressFromNominatim = (address: NominatimAddress | undefined) => {
  if (!address) {
    return {}
  }

  const line1 = joinParts(address.house_number, address.road) ?? address.road
  const line2 = firstNonEmpty(address.neighbourhood, address.suburb)
  const city = firstNonEmpty(
    address.city,
    address.town,
    address.village,
    address.hamlet,
    address.municipality,
    address.county
  )
  const region = firstNonEmpty(address.state, address.state_district, address.region, address.province, address.county)
  const postalCode = compactString(address.postcode)
  const countryCode = compactString(address.country_code)?.toUpperCase()

  return {
    line1,
    line2,
    city,
    region,
    postalCode,
    countryCode
  }
}

const metadataFromNominatim = (result: NominatimResult): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {
    lat: result.lat,
    lon: result.lon,
    osmType: result.osm_type,
    osmId: String(result.osm_id),
    placeId: String(result.place_id)
  }

  if (result.class) {
    metadata.category = result.class
  }
  if (result.type) {
    metadata.type = result.type
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const toAddressSuggestion = (result: NominatimResult): AddressSuggestion => ({
  id: `nominatim:${result.place_id}`,
  label: result.display_name,
  address: addressFromNominatim(result.address),
  score: result.importance,
  source: {
    provider: "nominatim",
    kind: "public",
    reference: `${result.osm_type}:${result.osm_id}`
  },
  metadata: metadataFromNominatim(result)
})

export const parseNominatimResponse = (body: unknown) =>
  Schema.decodeUnknown(NominatimResponseSchema)(body).pipe(
    Effect.map((results) => results.map(toAddressSuggestion))
  )

const buildRequest = (config: NominatimConfig, query: AddressQuery): HttpClientRequest.HttpClientRequest => {
  const baseUrl = config.baseUrl ?? "https://nominatim.openstreetmap.org"
  const normalized = normalizeAddressQuery(query)
  const limit = normalized.limit ?? config.defaultLimit ?? 5

  const params: Record<string, string> = {
    q: normalized.text,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(limit)
  }

  if (normalized.countryCode) {
    params.countrycodes = normalized.countryCode.toLowerCase()
  }

  if (config.email) {
    params.email = config.email
  }

  let request = HttpClientRequest.get(new URL("/search", baseUrl), {
    urlParams: params,
    acceptJson: true
  })

  request = HttpClientRequest.setHeader(request, "User-Agent", config.userAgent)

  if (config.referer) {
    request = HttpClientRequest.setHeader(request, "Referer", config.referer)
  }

  if (normalized.locale) {
    request = HttpClientRequest.setHeader(request, "Accept-Language", normalized.locale)
  }

  return request
}

export const makeNominatimProvider = (config: NominatimConfig) =>
  makeAddressProvider("nominatim", (query) =>
    HttpClient.execute(buildRequest(config, query)).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap((response) => response.json),
      Effect.flatMap(parseNominatimResponse)
    )
  )
