import { execute } from "@effect/platform/HttpClient";
import {
  get,
  type HttpClientRequest,
  setHeader,
} from "@effect/platform/HttpClientRequest";
import { toRecord } from "@effect/platform/UrlParams";
import type { AddressQuery, AddressSuggestion } from "@smart-address/core";
import { makeAddressProvider, normalizeAddressQuery } from "@smart-address/core";
import { Effect } from "effect";
import { currentTimeMillis } from "effect/Clock";
import {
  decodeUnknown,
  optional,
  type Schema,
  Array as SchemaArray,
  Number as SchemaNumber,
  String as SchemaString,
  Struct,
} from "effect/Schema";
import {
  compactString,
  firstNonEmpty,
  formatCoordinateParam,
  joinParts,
  metadataOrUndefined,
} from "./format";

export interface RadarAutocompleteConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly defaultLimit?: number;
  readonly layers?: string;
  readonly countryCode?: string;
  readonly near?: string | { lat: number; lng: number };
}

const RadarGeometrySchema = Struct({
  type: optional(SchemaString),
  coordinates: optional(SchemaArray(SchemaNumber)),
});

const RadarAddressSchema = Struct({
  latitude: optional(SchemaNumber),
  longitude: optional(SchemaNumber),
  geometry: optional(RadarGeometrySchema),
  country: optional(SchemaString),
  countryCode: optional(SchemaString),
  countryFlag: optional(SchemaString),
  county: optional(SchemaString),
  borough: optional(SchemaString),
  neighborhood: optional(SchemaString),
  city: optional(SchemaString),
  state: optional(SchemaString),
  stateCode: optional(SchemaString),
  postalCode: optional(SchemaString),
  number: optional(SchemaString),
  street: optional(SchemaString),
  layer: optional(SchemaString),
  formattedAddress: optional(SchemaString),
  placeLabel: optional(SchemaString),
  addressLabel: optional(SchemaString),
  distance: optional(SchemaNumber),
});

const RadarAutocompleteResponseSchema = Struct({
  addresses: SchemaArray(RadarAddressSchema),
});

type RadarAddress = Schema.Type<typeof RadarAddressSchema>;

const labelFromRadar = (address: RadarAddress): string => {
  const label = firstNonEmpty(
    address.formattedAddress,
    address.placeLabel,
    address.addressLabel
  );
  if (label) {
    return label;
  }

  const fallback = [
    joinParts(address.number, address.street),
    address.city,
    address.stateCode,
    address.countryCode,
  ]
    .map(compactString)
    .filter(Boolean)
    .join(", ");

  if (fallback) {
    return fallback;
  }

  if (
    typeof address.latitude === "number" &&
    typeof address.longitude === "number"
  ) {
    return `${address.latitude},${address.longitude}`;
  }

  return "Unknown address";
};

const formatRadarId = (address: RadarAddress): string => {
  const label =
    compactString(address.formattedAddress) ??
    compactString(address.placeLabel) ??
    compactString(address.addressLabel);
  const coordinates =
    typeof address.latitude === "number" &&
    typeof address.longitude === "number"
      ? `${address.latitude},${address.longitude}`
      : undefined;
  const layer = compactString(address.layer);
  const parts = [label, coordinates, layer].filter(Boolean);
  return `radar-autocomplete:${parts.length > 0 ? parts.join("|") : "unknown"}`;
};

const addressFromRadar = (address: RadarAddress) => {
  const line1 = joinParts(address.number, address.street);
  const line2 = firstNonEmpty(address.neighborhood, address.borough);
  const city = firstNonEmpty(address.city, address.county);
  const region = firstNonEmpty(address.state, address.stateCode);
  const postalCode = compactString(address.postalCode);
  const countryCode = compactString(address.countryCode)?.toUpperCase();

  const parts = {
    line1,
    line2,
    city,
    region,
    postalCode,
    countryCode,
  };

  return Object.values(parts).some((value) => value !== undefined) ? parts : {};
};

const metadataFromRadar = (
  address: RadarAddress
): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {};

  if (typeof address.latitude === "number") {
    metadata.lat = String(address.latitude);
  }
  if (typeof address.longitude === "number") {
    metadata.lng = String(address.longitude);
  }
  if (typeof address.distance === "number") {
    metadata.distance = String(address.distance);
  }
  if (address.layer) {
    metadata.layer = address.layer;
  }
  if (address.placeLabel) {
    metadata.placeLabel = address.placeLabel;
  }

  return metadataOrUndefined(metadata);
};

const toAddressSuggestion = (address: RadarAddress): AddressSuggestion => ({
  id: formatRadarId(address),
  label: labelFromRadar(address),
  address: addressFromRadar(address),
  source: {
    provider: "radar-autocomplete",
    kind: "public",
    reference: firstNonEmpty(
      address.formattedAddress,
      address.placeLabel,
      address.addressLabel
    ),
  },
  metadata: metadataFromRadar(address),
});

export const parseRadarAutocompleteResponse = (body: unknown) =>
  decodeUnknown(RadarAutocompleteResponseSchema)(body).pipe(
    Effect.map((response) => response.addresses.map(toAddressSuggestion))
  );

const buildRequest = (
  config: RadarAutocompleteConfig,
  query: AddressQuery
): HttpClientRequest => {
  const baseUrl = config.baseUrl ?? "https://api.radar.io";
  const normalized = normalizeAddressQuery(query);
  const limit = normalized.limit ?? config.defaultLimit ?? 5;
  const near = formatCoordinateParam(config.near);
  const countryCode = normalized.countryCode ?? config.countryCode;

  const params: Record<string, string> = {
    query: normalized.text,
    limit: String(limit),
  };

  if (config.layers) {
    params.layers = config.layers;
  }

  if (near) {
    params.near = near;
  }

  if (countryCode) {
    params.countryCode = countryCode;
  }

  let request = get(new URL("/v1/search/autocomplete", baseUrl), {
    urlParams: params,
    acceptJson: true,
  });

  request = setHeader(request, "Authorization", config.apiKey);

  return request;
};

export const makeRadarAutocompleteProvider = (
  config: RadarAutocompleteConfig
) =>
  makeAddressProvider("radar-autocomplete", (query) => {
    const request = buildRequest(config, query);
    const params = toRecord(request.urlParams);
    const logHeaders = { Authorization: "[REDACTED]" };

    return Effect.gen(function* () {
      const start = yield* currentTimeMillis;
      yield* Effect.logInfo("radar-autocomplete request", {
        url: request.url,
        params,
        headers: logHeaders,
        query,
      });

      const response = yield* execute(request);
      const elapsedMs = (yield* currentTimeMillis) - start;

      yield* Effect.logInfo("radar-autocomplete response", {
        status: response.status,
        elapsedMs,
        headers: response.headers,
      });

      if (response.status < 200 || response.status >= 300) {
        const body = yield* response.text;
        yield* Effect.logError("radar-autocomplete response error", {
          status: response.status,
          elapsedMs,
          body,
        });
        return yield* Effect.fail(
          new Error(`Radar autocomplete failed: ${response.status}`)
        );
      }

      const body = yield* response.json;
      yield* Effect.logDebug("radar-autocomplete response body", body);

      return yield* parseRadarAutocompleteResponse(body).pipe(
        Effect.tapError((error) =>
          Effect.logError("radar-autocomplete parse error", error)
        )
      );
    }).pipe(
      Effect.withSpan("radar-autocomplete.request", {
        attributes: {
          url: request.url,
          params,
          provider: "radar-autocomplete",
        },
      }),
      Effect.onInterrupt(() =>
        Effect.logWarning("radar-autocomplete request interrupted")
      )
    );
  });
