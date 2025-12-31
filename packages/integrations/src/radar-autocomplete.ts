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

export type RadarAutocompleteConfig = {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly defaultLimit?: number
  readonly layers?: string
  readonly countryCode?: string
  readonly near?: string | { lat: number; lng: number }
}

const RadarGeometrySchema = Schema.Struct({
  type: Schema.optional(Schema.String),
  coordinates: Schema.optional(Schema.Array(Schema.Number))
})

const RadarAddressSchema = Schema.Struct({
  latitude: Schema.optional(Schema.Number),
  longitude: Schema.optional(Schema.Number),
  geometry: Schema.optional(RadarGeometrySchema),
  country: Schema.optional(Schema.String),
  countryCode: Schema.optional(Schema.String),
  countryFlag: Schema.optional(Schema.String),
  county: Schema.optional(Schema.String),
  borough: Schema.optional(Schema.String),
  neighborhood: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  stateCode: Schema.optional(Schema.String),
  postalCode: Schema.optional(Schema.String),
  number: Schema.optional(Schema.String),
  street: Schema.optional(Schema.String),
  layer: Schema.optional(Schema.String),
  formattedAddress: Schema.optional(Schema.String),
  placeLabel: Schema.optional(Schema.String),
  addressLabel: Schema.optional(Schema.String),
  distance: Schema.optional(Schema.Number)
})

const RadarAutocompleteResponseSchema = Schema.Struct({
  addresses: Schema.Array(RadarAddressSchema)
})

type RadarAddress = Schema.Schema.Type<typeof RadarAddressSchema>

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

const labelFromRadar = (address: RadarAddress): string => {
  const label = firstNonEmpty(address.formattedAddress, address.placeLabel, address.addressLabel)
  if (label) {
    return label
  }

  const fallback = [
    joinParts(address.number, address.street),
    address.city,
    address.stateCode,
    address.countryCode
  ]
    .map(compactString)
    .filter(Boolean)
    .join(", ")

  if (fallback) {
    return fallback
  }

  if (typeof address.latitude === "number" && typeof address.longitude === "number") {
    return `${address.latitude},${address.longitude}`
  }

  return "Unknown address"
}

const formatRadarId = (address: RadarAddress): string => {
  const label =
    compactString(address.formattedAddress) ??
    compactString(address.placeLabel) ??
    compactString(address.addressLabel)
  const coordinates =
    typeof address.latitude === "number" && typeof address.longitude === "number"
      ? `${address.latitude},${address.longitude}`
      : undefined
  const layer = compactString(address.layer)
  const parts = [label, coordinates, layer].filter(Boolean)
  return `radar-autocomplete:${parts.length > 0 ? parts.join("|") : "unknown"}`
}

const addressFromRadar = (address: RadarAddress) => {
  const line1 = joinParts(address.number, address.street)
  const line2 = firstNonEmpty(address.neighborhood, address.borough)
  const city = firstNonEmpty(address.city, address.county)
  const region = firstNonEmpty(address.state, address.stateCode)
  const postalCode = compactString(address.postalCode)
  const countryCode = compactString(address.countryCode)?.toUpperCase()

  const parts = {
    line1,
    line2,
    city,
    region,
    postalCode,
    countryCode
  }

  return Object.values(parts).some((value) => value !== undefined) ? parts : {}
}

const metadataFromRadar = (address: RadarAddress): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {}

  if (typeof address.latitude === "number") {
    metadata.lat = String(address.latitude)
  }
  if (typeof address.longitude === "number") {
    metadata.lng = String(address.longitude)
  }
  if (typeof address.distance === "number") {
    metadata.distance = String(address.distance)
  }
  if (address.layer) {
    metadata.layer = address.layer
  }
  if (address.placeLabel) {
    metadata.placeLabel = address.placeLabel
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const toAddressSuggestion = (address: RadarAddress): AddressSuggestion => ({
  id: formatRadarId(address),
  label: labelFromRadar(address),
  address: addressFromRadar(address),
  source: {
    provider: "radar-autocomplete",
    kind: "public",
    reference: firstNonEmpty(address.formattedAddress, address.placeLabel, address.addressLabel)
  },
  metadata: metadataFromRadar(address)
})

export const parseRadarAutocompleteResponse = (body: unknown) =>
  Schema.decodeUnknown(RadarAutocompleteResponseSchema)(body).pipe(
    Effect.map((response) => response.addresses.map(toAddressSuggestion))
  )

const formatNear = (value: RadarAutocompleteConfig["near"]): string | undefined => {
  if (!value) {
    return undefined
  }
  if (typeof value === "string") {
    return value.trim() || undefined
  }
  return `${value.lat},${value.lng}`
}

const buildRequest = (config: RadarAutocompleteConfig, query: AddressQuery): HttpClientRequest.HttpClientRequest => {
  const baseUrl = config.baseUrl ?? "https://api.radar.io"
  const normalized = normalizeAddressQuery(query)
  const limit = normalized.limit ?? config.defaultLimit ?? 5
  const near = formatNear(config.near)
  const countryCode = normalized.countryCode ?? config.countryCode

  const params: Record<string, string> = {
    query: normalized.text,
    limit: String(limit)
  }

  if (config.layers) {
    params.layers = config.layers
  }

  if (near) {
    params.near = near
  }

  if (countryCode) {
    params.countryCode = countryCode
  }

  let request = HttpClientRequest.get(new URL("/v1/search/autocomplete", baseUrl), {
    urlParams: params,
    acceptJson: true
  })

  request = HttpClientRequest.setHeader(request, "Authorization", config.apiKey)

  return request
}

export const makeRadarAutocompleteProvider = (config: RadarAutocompleteConfig) =>
  makeAddressProvider("radar-autocomplete", (query) => {
    const request = buildRequest(config, query)
    const params = UrlParams.toRecord(request.urlParams)
    const logHeaders = { Authorization: "[REDACTED]" }

    return Effect.gen(function* () {
      const start = yield* Clock.currentTimeMillis
      yield* Effect.logInfo("radar-autocomplete request", {
        url: request.url,
        params,
        headers: logHeaders,
        query
      })

      const response = yield* HttpClient.execute(request)
      const elapsedMs = (yield* Clock.currentTimeMillis) - start

      yield* Effect.logInfo("radar-autocomplete response", {
        status: response.status,
        elapsedMs,
        headers: response.headers
      })

      if (response.status < 200 || response.status >= 300) {
        const body = yield* response.text
        yield* Effect.logError("radar-autocomplete response error", {
          status: response.status,
          elapsedMs,
          body
        })
        return yield* Effect.fail(new Error(`Radar autocomplete failed: ${response.status}`))
      }

      const body = yield* response.json
      yield* Effect.logInfo("radar-autocomplete response body", body)

      return yield* parseRadarAutocompleteResponse(body).pipe(
        Effect.tapError((error) => Effect.logError("radar-autocomplete parse error", error))
      )
    }).pipe(
      Effect.withSpan("radar-autocomplete.request", {
        attributes: {
          url: request.url,
          params,
          provider: "radar-autocomplete"
        }
      }),
      Effect.onInterrupt(() => Effect.logWarning("radar-autocomplete request interrupted"))
    )
  })
