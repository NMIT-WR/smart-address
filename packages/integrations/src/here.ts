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

export type HereConfig = {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly defaultLimit?: number
}

const HerePositionSchema = Schema.Struct({
  lat: Schema.Number,
  lng: Schema.Number
})

const HereAddressSchema = Schema.Struct({
  label: Schema.optional(Schema.String),
  countryCode: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  county: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  district: Schema.optional(Schema.String),
  subdistrict: Schema.optional(Schema.String),
  street: Schema.optional(Schema.String),
  houseNumber: Schema.optional(Schema.String),
  postalCode: Schema.optional(Schema.String)
})

const HereItemSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  resultType: Schema.optional(Schema.String),
  address: Schema.optional(HereAddressSchema),
  position: Schema.optional(HerePositionSchema)
})

const HereResponseSchema = Schema.Struct({
  items: Schema.optional(Schema.Array(HereItemSchema))
})

type HereItem = Schema.Schema.Type<typeof HereItemSchema>
type HereAddress = Schema.Schema.Type<typeof HereAddressSchema>
type HereResponse = Schema.Schema.Type<typeof HereResponseSchema>

const addressFromHere = (address: HereAddress | undefined) => {
  if (!address) {
    return {}
  }

  const line1 = joinParts(address.houseNumber, address.street) ?? address.street
  const line2 = firstNonEmpty(address.district, address.subdistrict)
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

const metadataFromHere = (item: HereItem): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {}

  if (item.resultType) {
    metadata.resultType = item.resultType
  }

  if (item.position) {
    metadata.lat = String(item.position.lat)
    metadata.lng = String(item.position.lng)
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const labelFromHere = (item: HereItem): string => item.address?.label ?? item.title

const toAddressSuggestion = (item: HereItem): AddressSuggestion => ({
  id: toProviderId("here", item.id),
  label: labelFromHere(item),
  address: addressFromHere(item.address),
  source: {
    provider: "here",
    kind: "public",
    reference: item.id
  },
  metadata: metadataFromHere(item)
})

export const parseHereResponse = (body: unknown) =>
  Schema.decodeUnknown(HereResponseSchema)(body).pipe(
    Effect.map((response: HereResponse) => (response.items ?? []).map(toAddressSuggestion))
  )

const buildRequest = (config: HereConfig, query: AddressQuery): HttpClientRequest.HttpClientRequest => {
  const baseUrl = config.baseUrl ?? "https://autocomplete.search.hereapi.com"
  const normalized = normalizeAddressQuery(query)
  const limit = normalized.limit ?? config.defaultLimit ?? 5

  const params: Record<string, string> = {
    q: normalized.text,
    apiKey: config.apiKey,
    limit: String(limit)
  }

  if (normalized.countryCode) {
    params.in = `countryCode:${normalized.countryCode}`
  }

  if (normalized.locale) {
    params.lang = normalized.locale
  }

  return HttpClientRequest.get(new URL("/v1/autocomplete", baseUrl), {
    urlParams: params,
    acceptJson: true
  })
}

export const makeHereProvider = (config: HereConfig) =>
  makeAddressProvider("here", (query) =>
    HttpClient.execute(buildRequest(config, query)).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap((response) => response.json),
      Effect.flatMap(parseHereResponse)
    )
  )
