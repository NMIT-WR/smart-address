import { execute } from "@effect/platform/HttpClient";
import {
  get,
  type HttpClientRequest,
  setHeader,
} from "@effect/platform/HttpClientRequest";
import { filterStatusOk } from "@effect/platform/HttpClientResponse";
import {
  type AddressQuery,
  type AddressSuggestion,
  makeAddressProvider,
  normalizeAddressQuery,
} from "@smart-address/core";
import { Effect } from "effect";
import {
  decodeUnknown,
  NumberFromString,
  optional,
  type Schema,
  Array as SchemaArray,
  Number as SchemaNumber,
  String as SchemaString,
  Struct,
  Union,
} from "effect/Schema";

export interface NominatimConfig {
  readonly baseUrl?: string;
  readonly userAgent: string;
  readonly email?: string;
  readonly referer?: string;
  readonly defaultLimit?: number;
}

const NominatimAddressSchema = Struct({
  house_number: optional(SchemaString),
  road: optional(SchemaString),
  neighbourhood: optional(SchemaString),
  suburb: optional(SchemaString),
  city: optional(SchemaString),
  town: optional(SchemaString),
  village: optional(SchemaString),
  hamlet: optional(SchemaString),
  municipality: optional(SchemaString),
  county: optional(SchemaString),
  state: optional(SchemaString),
  state_district: optional(SchemaString),
  region: optional(SchemaString),
  province: optional(SchemaString),
  postcode: optional(SchemaString),
  country_code: optional(SchemaString),
});

const NominatimResultSchema = Struct({
  place_id: Union(SchemaNumber, NumberFromString),
  osm_type: SchemaString,
  osm_id: Union(SchemaNumber, NumberFromString),
  lat: SchemaString,
  lon: SchemaString,
  display_name: SchemaString,
  importance: optional(SchemaNumber),
  class: optional(SchemaString),
  type: optional(SchemaString),
  address: optional(NominatimAddressSchema),
});

const NominatimResponseSchema = SchemaArray(NominatimResultSchema);

type NominatimResult = Schema.Type<typeof NominatimResultSchema>;
type NominatimAddress = Schema.Type<typeof NominatimAddressSchema>;

const compactString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const firstNonEmpty = (
  ...values: Array<string | undefined>
): string | undefined => {
  for (const value of values) {
    const compacted = compactString(value);
    if (compacted) {
      return compacted;
    }
  }
  return undefined;
};

const joinParts = (first?: string, second?: string): string | undefined => {
  const left = compactString(first);
  const right = compactString(second);
  if (left && right) {
    return `${left} ${right}`;
  }
  return left ?? right;
};

const addressFromNominatim = (address: NominatimAddress | undefined) => {
  if (!address) {
    return {};
  }

  const line1 = joinParts(address.house_number, address.road) ?? address.road;
  const line2 = firstNonEmpty(address.neighbourhood, address.suburb);
  const city = firstNonEmpty(
    address.city,
    address.town,
    address.village,
    address.hamlet,
    address.municipality,
    address.county
  );
  const region = firstNonEmpty(
    address.state,
    address.state_district,
    address.region,
    address.province,
    address.county
  );
  const postalCode = compactString(address.postcode);
  const countryCode = compactString(address.country_code)?.toUpperCase();

  return {
    line1,
    line2,
    city,
    region,
    postalCode,
    countryCode,
  };
};

const metadataFromNominatim = (
  result: NominatimResult
): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {
    lat: result.lat,
    lon: result.lon,
    osmType: result.osm_type,
    osmId: String(result.osm_id),
    placeId: String(result.place_id),
  };

  if (result.class) {
    metadata.category = result.class;
  }
  if (result.type) {
    metadata.type = result.type;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const toAddressSuggestion = (result: NominatimResult): AddressSuggestion => ({
  id: `nominatim:${result.place_id}`,
  label: result.display_name,
  address: addressFromNominatim(result.address),
  score: result.importance,
  source: {
    provider: "nominatim",
    kind: "public",
    reference: `${result.osm_type}:${result.osm_id}`,
  },
  metadata: metadataFromNominatim(result),
});

export const parseNominatimResponse = (body: unknown) =>
  decodeUnknown(NominatimResponseSchema)(body).pipe(
    Effect.map((results) => results.map(toAddressSuggestion))
  );

const buildRequest = (
  config: NominatimConfig,
  query: AddressQuery
): HttpClientRequest => {
  const baseUrl = config.baseUrl ?? "https://nominatim.openstreetmap.org";
  const normalized = normalizeAddressQuery(query);
  const limit = normalized.limit ?? config.defaultLimit ?? 5;

  const params: Record<string, string> = {
    q: normalized.text,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(limit),
  };

  if (normalized.countryCode) {
    params.countrycodes = normalized.countryCode.toLowerCase();
  }

  if (config.email) {
    params.email = config.email;
  }

  let request = get(new URL("/search", baseUrl), {
    urlParams: params,
    acceptJson: true,
  });

  request = setHeader(request, "User-Agent", config.userAgent);

  if (config.referer) {
    request = setHeader(request, "Referer", config.referer);
  }

  if (normalized.locale) {
    request = setHeader(request, "Accept-Language", normalized.locale);
  }

  return request;
};

export const makeNominatimProvider = (config: NominatimConfig) =>
  makeAddressProvider("nominatim", (query) =>
    execute(buildRequest(config, query)).pipe(
      Effect.flatMap(filterStatusOk),
      Effect.flatMap((response) => response.json),
      Effect.flatMap(parseNominatimResponse)
    )
  );
