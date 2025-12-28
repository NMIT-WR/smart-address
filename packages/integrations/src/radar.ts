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
import { compactString, firstNonEmpty, joinParts, toProviderId } from "./address-utils"

export type RadarConfig = {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly defaultLimit?: number
}

const RadarAddressSchema = Schema.Struct({
  addressLabel: Schema.optional(Schema.String),
  addressNumber: Schema.optional(Schema.String),
  street: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  postalCode: Schema.optional(Schema.String),
  countryCode: Schema.optional(Schema.String),
  neighborhood: Schema.optional(Schema.String),
  borough: Schema.optional(Schema.String),
  county: Schema.optional(Schema.String),
  placeId: Schema.optional(Schema.String),
  latitude: Schema.optional(Schema.Number),
  longitude: Schema.optional(Schema.Number)
})

const RadarResponseSchema = Schema.Struct({
  addresses: Schema.optional(Schema.Array(RadarAddressSchema))
})

type RadarAddress = Schema.Schema.Type<typeof RadarAddressSchema>
type RadarResponse = Schema.Schema.Type<typeof RadarResponseSchema>

const buildFallbackLabel = (address: RadarAddress): string | undefined => {
  const line1 = joinParts(address.addressNumber, address.street)
  const parts = [
    line1,
    address.city,
    address.state,
    address.postalCode,
    address.countryCode
  ]
    .map(compactString)
    .filter((value): value is string => Boolean(value))

  if (parts.length === 0) {
    return undefined
  }

  return parts.join(", ")
}

const addressFromRadar = (address: RadarAddress) => {
  const line1 = joinParts(address.addressNumber, address.street)
  const line2 = firstNonEmpty(address.neighborhood, address.borough)
  const city = compactString(address.city)
  const region = firstNonEmpty(address.state, address.county)
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

const buildRadarId = (address: RadarAddress): string => {
  const fallback = [
    address.placeId,
    address.addressLabel,
    joinParts(address.addressNumber, address.street),
    address.city,
    address.state,
    address.postalCode,
    address.countryCode,
    address.latitude !== undefined && address.longitude !== undefined
      ? `${address.latitude},${address.longitude}`
      : undefined
  ]
    .map(compactString)
    .find((value): value is string => Boolean(value))

  return toProviderId("radar", fallback ?? "unknown")
}

const metadataFromRadar = (address: RadarAddress): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {}

  if (address.placeId) {
    metadata.placeId = address.placeId
  }

  if (address.latitude !== undefined && address.longitude !== undefined) {
    metadata.lat = String(address.latitude)
    metadata.lng = String(address.longitude)
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const labelFromRadar = (address: RadarAddress): string => {
  const label = compactString(address.addressLabel)
  const fallback = buildFallbackLabel(address)
  return label ?? fallback ?? "Unknown address"
}

const toAddressSuggestion = (address: RadarAddress): AddressSuggestion => ({
  id: buildRadarId(address),
  label: labelFromRadar(address),
  address: addressFromRadar(address),
  source: {
    provider: "radar",
    kind: "public",
    reference: address.placeId
  },
  metadata: metadataFromRadar(address)
})

export const parseRadarResponse = (body: unknown) =>
  Schema.decodeUnknown(RadarResponseSchema)(body).pipe(
    Effect.map((response: RadarResponse) => (response.addresses ?? []).map(toAddressSuggestion))
  )

const buildRequest = (config: RadarConfig, query: AddressQuery): HttpClientRequest.HttpClientRequest => {
  const baseUrl = config.baseUrl ?? "https://api.radar.io"
  const normalized = normalizeAddressQuery(query)
  const limit = normalized.limit ?? config.defaultLimit ?? 5

  const params: Record<string, string> = {
    query: normalized.text,
    limit: String(limit)
  }

  if (normalized.countryCode) {
    params.country = normalized.countryCode
  }

  const request = HttpClientRequest.get(new URL("/v1/search/autocomplete", baseUrl), {
    urlParams: params,
    acceptJson: true
  })

  return HttpClientRequest.setHeader(request, "Authorization", config.apiKey)
}

export const makeRadarProvider = (config: RadarConfig) =>
  makeAddressProvider("radar", (query) =>
    HttpClient.execute(buildRequest(config, query)).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap((response) => response.json),
      Effect.flatMap(parseRadarResponse)
    )
  )
