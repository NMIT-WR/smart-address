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

export type HereConfig = {
  readonly apiKey: string
  readonly defaultAt?: { readonly lat: number; readonly lng: number }
  readonly defaultLimit?: number
}

const HerePositionSchema = Schema.Struct({
  lat: Schema.Number,
  lng: Schema.Number
})

const HereAddressSchema = Schema.Struct({
  label: Schema.optional(Schema.String),
  countryCode: Schema.optional(Schema.String),
  countryName: Schema.optional(Schema.String),
  stateCode: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  countyCode: Schema.optional(Schema.String),
  county: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  district: Schema.optional(Schema.String),
  subdistrict: Schema.optional(Schema.String),
  street: Schema.optional(Schema.String),
  houseNumber: Schema.optional(Schema.String),
  postalCode: Schema.optional(Schema.String)
})

const HereScoringSchema = Schema.Struct({
  queryScore: Schema.optional(Schema.Number),
  fieldScore: Schema.optional(
    Schema.Struct({
      placeName: Schema.optional(Schema.Number),
      city: Schema.optional(Schema.Number),
      streets: Schema.optional(Schema.Array(Schema.Number)),
      houseNumber: Schema.optional(Schema.Number),
      postalCode: Schema.optional(Schema.Number)
    })
  )
})

const HereItemSchema = Schema.Struct({
  title: Schema.String,
  id: Schema.String,
  resultType: Schema.optional(Schema.String),
  localityType: Schema.optional(Schema.String),
  address: Schema.optional(HereAddressSchema),
  position: Schema.optional(HerePositionSchema),
  scoring: Schema.optional(HereScoringSchema)
})

const HereResponseSchema = Schema.Struct({
  items: Schema.Array(HereItemSchema)
})

type HereItem = Schema.Schema.Type<typeof HereItemSchema>
type HereAddress = Schema.Schema.Type<typeof HereAddressSchema>
type HerePosition = Schema.Schema.Type<typeof HerePositionSchema>

const compactString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
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

  const line1 = joinParts(address.street, address.houseNumber)
  const line2 = compactString(address.district) ?? compactString(address.subdistrict)
  const city = compactString(address.city)
  const region = compactString(address.state) ?? compactString(address.county)
  const postalCode = compactString(address.postalCode)
  const countryCode = compactString(address.countryCode)

  return {
    line1,
    line2,
    city,
    region,
    postalCode,
    countryCode
  }
}

const metadataFromHere = (
  item: HereItem,
  position: HerePosition | undefined
): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {}

  if (position) {
    metadata.lat = String(position.lat)
    metadata.lng = String(position.lng)
  }

  if (item.resultType) {
    metadata.resultType = item.resultType
  }

  if (item.localityType) {
    metadata.localityType = item.localityType
  }

  if (item.scoring?.queryScore !== undefined) {
    metadata.queryScore = String(item.scoring.queryScore)
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const toAddressSuggestion = (item: HereItem): AddressSuggestion => ({
  id: `here:${item.id}`,
  label: item.title,
  address: addressFromHere(item.address),
  score: item.scoring?.queryScore,
  source: {
    provider: "here",
    kind: "internal",
    reference: item.id
  },
  metadata: metadataFromHere(item, item.position)
})

export const parseHereResponse = (body: unknown) =>
  Schema.decodeUnknown(HereResponseSchema)(body).pipe(
    Effect.map((response) => response.items.map(toAddressSuggestion))
  )

const buildRequest = (config: HereConfig, query: AddressQuery): HttpClientRequest.HttpClientRequest => {
  const baseUrl = "https://discover.search.hereapi.com"
  const normalized = normalizeAddressQuery(query)
  const limit = normalized.limit ?? config.defaultLimit ?? 5

  const defaultAt = config.defaultAt ?? { lat: 0, lng: 0 }

  const params: Record<string, string> = {
    apiKey: config.apiKey,
    q: normalized.text,
    at: `${defaultAt.lat},${defaultAt.lng}`,
    limit: String(limit),
    show: "details"
  }

  if (normalized.countryCode) {
    params.in = `countryCode:${normalized.countryCode.toUpperCase()}`
  }

  if (normalized.locale) {
    params.lang = normalized.locale
  }

  return HttpClientRequest.get(new URL("/v1/discover", baseUrl), {
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
