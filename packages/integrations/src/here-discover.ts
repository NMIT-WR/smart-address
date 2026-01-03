import * as HttpClient from "@effect/platform/HttpClient";
import {
  get,
  type HttpClientRequest,
} from "@effect/platform/HttpClientRequest";
import { toRecord } from "@effect/platform/UrlParams";
import {
  type AddressQuery,
  type AddressSuggestion,
  makeAddressProvider,
  normalizeAddressQuery,
} from "@smart-address/core";
import { Effect } from "effect";
import { currentTimeMillis } from "effect/Clock";
import {
  decodeUnknown,
  optional,
  type Schema,
  Array as SchemaArray,
  Boolean as SchemaBoolean,
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

export interface HereDiscoverConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly defaultLimit?: number;
  readonly language?: string;
  readonly inArea?: string;
  readonly at?: string | { lat: number; lng: number };
}

const HerePositionSchema = Struct({
  lat: SchemaNumber,
  lng: SchemaNumber,
});

const HereCategorySchema = Struct({
  id: optional(SchemaString),
  name: optional(SchemaString),
  primary: optional(SchemaBoolean),
});

const HereScoringSchema = Struct({
  queryScore: optional(SchemaNumber),
});

const HereAddressSchema = Struct({
  label: optional(SchemaString),
  houseNumber: optional(SchemaString),
  street: optional(SchemaString),
  district: optional(SchemaString),
  subdistrict: optional(SchemaString),
  city: optional(SchemaString),
  county: optional(SchemaString),
  state: optional(SchemaString),
  stateCode: optional(SchemaString),
  postalCode: optional(SchemaString),
  countryCode: optional(SchemaString),
  countryName: optional(SchemaString),
});

const HereItemSchema = Struct({
  id: SchemaString,
  title: SchemaString,
  address: optional(HereAddressSchema),
  position: optional(HerePositionSchema),
  categories: optional(SchemaArray(HereCategorySchema)),
  resultType: optional(SchemaString),
  scoring: optional(HereScoringSchema),
  distance: optional(SchemaNumber),
});

const HereDiscoverResponseSchema = Struct({
  items: SchemaArray(HereItemSchema),
});

type HereAddress = Schema.Type<typeof HereAddressSchema>;
type HereItem = Schema.Type<typeof HereItemSchema>;

const addressFromHere = (address: HereAddress | undefined) => {
  if (!address) {
    return {};
  }

  const line1 = joinParts(address.houseNumber, address.street);
  const line2 = firstNonEmpty(address.district, address.subdistrict);
  const city = firstNonEmpty(address.city, address.county);
  const region = firstNonEmpty(address.state, address.stateCode);
  const postalCode = compactString(address.postalCode);
  const countryCode = compactString(address.countryCode);

  return {
    ...(line1 ? { line1 } : {}),
    ...(line2 ? { line2 } : {}),
    ...(city ? { city } : {}),
    ...(region ? { region } : {}),
    ...(postalCode ? { postalCode } : {}),
    ...(countryCode ? { countryCode: countryCode.toUpperCase() } : {}),
  };
};

const metadataFromHere = (
  item: HereItem
): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {};

  if (item.position) {
    metadata.lat = String(item.position.lat);
    metadata.lng = String(item.position.lng);
  }

  if (item.resultType) {
    metadata.resultType = item.resultType;
  }

  if (typeof item.distance === "number") {
    metadata.distance = String(item.distance);
  }

  const category =
    item.categories?.find((entry) => entry.primary) ?? item.categories?.[0];
  if (category?.id) {
    metadata.categoryId = category.id;
  }
  if (category?.name) {
    metadata.categoryName = category.name;
  }

  return metadataOrUndefined(metadata);
};

const toAddressSuggestion = (item: HereItem): AddressSuggestion => ({
  id: `here-discover:${item.id}`,
  label: item.address?.label ?? item.title,
  address: addressFromHere(item.address),
  score: item.scoring?.queryScore,
  source: {
    provider: "here-discover",
    kind: "public",
    reference: item.id,
  },
  metadata: metadataFromHere(item),
});

export const parseHereDiscoverResponse = (body: unknown) =>
  decodeUnknown(HereDiscoverResponseSchema)(body).pipe(
    Effect.map((response) => response.items.map(toAddressSuggestion))
  );

const buildRequest = (
  config: HereDiscoverConfig,
  query: AddressQuery
): HttpClientRequest => {
  const baseUrl = config.baseUrl ?? "https://discover.search.hereapi.com";
  const normalized = normalizeAddressQuery(query);
  const limit = normalized.limit ?? config.defaultLimit ?? 5;
  const language = normalized.locale ?? config.language;
  const inAreaFromQuery =
    normalized.countryCode && normalized.countryCode.length === 3
      ? `countryCode:${normalized.countryCode}`
      : undefined;
  const inArea = inAreaFromQuery ?? config.inArea;
  const at = formatCoordinateParam(config.at);

  const params: Record<string, string> = {
    q: normalized.text,
    apiKey: config.apiKey,
  };

  params.limit = String(limit);

  if (language) {
    params.lang = language;
  }

  if (inArea) {
    params.in = inArea;
  }

  if (at) {
    params.at = at;
  }

  return get(new URL("/v1/discover", baseUrl), {
    urlParams: params,
    acceptJson: true,
  });
};

export const makeHereDiscoverProvider = (config: HereDiscoverConfig) =>
  makeAddressProvider("here-discover", (query) => {
    const normalized = normalizeAddressQuery(query);
    const request = buildRequest(config, query);
    const params = toRecord(request.urlParams);
    const logParams = { ...params, apiKey: "[REDACTED]" };

    return Effect.gen(function* () {
      if (normalized.countryCode && normalized.countryCode.length !== 3) {
        yield* Effect.logWarning(
          "here-discover ignores countryCode: expected ISO 3166-1 alpha-3; falling back to HERE_DISCOVER_IN_AREA",
          {
            countryCode: normalized.countryCode,
            inArea: config.inArea,
          }
        );
      }

      const start = yield* currentTimeMillis;
      yield* Effect.logInfo("here-discover request", {
        url: request.url,
        params: logParams,
        query,
      });

      const response = yield* HttpClient.execute(request);
      const elapsedMs = (yield* currentTimeMillis) - start;

      yield* Effect.logInfo("here-discover response", {
        status: response.status,
        elapsedMs,
        headers: response.headers,
      });

      if (response.status < 200 || response.status >= 300) {
        const body = yield* response.text;
        yield* Effect.logError("here-discover response error", {
          status: response.status,
          elapsedMs,
          body,
        });
        return yield* Effect.fail(
          new Error(`HERE discover failed: ${response.status}`)
        );
      }

      const body = yield* response.json;
      yield* Effect.logInfo("here-discover response body", body);

      return yield* parseHereDiscoverResponse(body).pipe(
        Effect.tapError((error) =>
          Effect.logError("here-discover parse error", error)
        )
      );
    }).pipe(
      Effect.withSpan("here-discover.request", {
        attributes: {
          url: request.url,
          params: logParams,
          provider: "here-discover",
        },
      }),
      Effect.onInterrupt(() =>
        Effect.logWarning("here-discover request interrupted")
      )
    );
  });
