import type { HereDiscoverConfig } from "@smart-address/integrations/here-discover";
import type { NominatimConfig } from "@smart-address/integrations/nominatim";
import type { RadarAutocompleteConfig } from "@smart-address/integrations/radar-autocomplete";
import { Config, Option, Redacted } from "effect";
import { type Duration, millis, seconds } from "effect/Duration";
import type { AddressCacheConfig } from "./cache";
import type { AddressSqliteConfig } from "./sqlite";

type AddressServiceConfig = {
  readonly port: number;
  readonly providerTimeout: Duration;
  readonly nominatimRateLimit: Duration | null;
  readonly nominatim: NominatimConfig;
  readonly radarAutocomplete: RadarAutocompleteConfig | null;
  readonly radarAutocompleteRateLimit: Duration | null;
  readonly hereDiscover: HereDiscoverConfig | null;
  readonly hereDiscoverRateLimit: Duration | null;
  readonly cache: AddressCacheConfig;
  readonly sqlite: AddressSqliteConfig;
};

const rawConfig = Config.all({
  port: Config.port("PORT").pipe(Config.withDefault(8787)),
  providerTimeoutMs: Config.integer("PROVIDER_TIMEOUT_MS").pipe(
    Config.withDefault(4000)
  ),
  defaultLimit: Config.option(Config.integer("NOMINATIM_DEFAULT_LIMIT")),
  nominatimRateLimitMs: Config.option(
    Config.integer("NOMINATIM_RATE_LIMIT_MS")
  ),
  l1Capacity: Config.option(Config.integer("CACHE_L1_CAPACITY")),
  l1TtlMs: Config.option(Config.integer("CACHE_L1_TTL_MS")),
  l2BaseTtlMs: Config.option(Config.integer("CACHE_L2_BASE_TTL_MS")),
  l2MinTtlMs: Config.option(Config.integer("CACHE_L2_MIN_TTL_MS")),
  l2MaxTtlMs: Config.option(Config.integer("CACHE_L2_MAX_TTL_MS")),
  l2SWRMs: Config.option(Config.integer("CACHE_L2_SWR_MS")),
  nominatimBaseUrl: Config.string("NOMINATIM_BASE_URL").pipe(
    Config.withDefault("")
  ),
  nominatimEmail: Config.string("NOMINATIM_EMAIL").pipe(Config.withDefault("")),
  nominatimReferer: Config.string("NOMINATIM_REFERER").pipe(
    Config.withDefault("")
  ),
  nominatimUserAgent: Config.string("NOMINATIM_USER_AGENT").pipe(
    Config.withDefault("smart-address-service")
  ),
  radarApiKey: Config.option(Config.redacted("RADAR_API_KEY")),
  radarBaseUrl: Config.option(Config.string("RADAR_AUTOCOMPLETE_BASE_URL")),
  radarDefaultLimit: Config.option(
    Config.integer("RADAR_AUTOCOMPLETE_DEFAULT_LIMIT")
  ),
  radarLayers: Config.option(Config.string("RADAR_AUTOCOMPLETE_LAYERS")),
  radarNear: Config.option(Config.string("RADAR_AUTOCOMPLETE_NEAR")),
  radarCountryCode: Config.option(
    Config.string("RADAR_AUTOCOMPLETE_COUNTRY_CODE")
  ),
  radarRateLimitMs: Config.option(
    Config.integer("RADAR_AUTOCOMPLETE_RATE_LIMIT_MS")
  ),
  hereApiKey: Config.option(Config.redacted("HERE_API_KEY")),
  hereBaseUrl: Config.option(Config.string("HERE_DISCOVER_BASE_URL")),
  hereDefaultLimit: Config.option(
    Config.integer("HERE_DISCOVER_DEFAULT_LIMIT")
  ),
  hereLanguage: Config.option(Config.string("HERE_DISCOVER_LANGUAGE")),
  hereInArea: Config.option(Config.string("HERE_DISCOVER_IN_AREA")),
  hereAt: Config.option(Config.string("HERE_DISCOVER_AT")),
  hereDefaultLat: Config.option(Config.number("HERE_DEFAULT_LAT")),
  hereDefaultLng: Config.option(Config.number("HERE_DEFAULT_LNG")),
  hereRateLimitMs: Config.option(Config.integer("HERE_DISCOVER_RATE_LIMIT_MS")),
  sqlitePath: Config.string("SMART_ADDRESS_DB_PATH").pipe(
    Config.withDefault("")
  ),
});

const optionalValue = <A>(value: Option.Option<A>): A | undefined =>
  Option.getOrUndefined(value);

const trimmedOptional = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const trimmedOptionalFromOption = (
  value: Option.Option<string>
): string | undefined => trimmedOptional(optionalValue(value));

const redactedOptional = (
  value: Redacted.Redacted | undefined
): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = Redacted.value(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const trimmedOrDefault = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const defaultCoordinate = (
  lat: number | undefined,
  lng: number | undefined
): { lat: number; lng: number } | undefined =>
  lat !== undefined && lng !== undefined ? { lat, lng } : undefined;

const toRateLimit = (
  value: number | undefined,
  fallback: Duration | null
): Duration | null => {
  if (value === undefined) {
    return fallback;
  }
  return value <= 0 ? null : millis(value);
};

const withOptionalValue = <K extends keyof AddressCacheConfig, V>(
  key: K,
  value: V | undefined
): Partial<AddressCacheConfig> =>
  value === undefined ? {} : ({ [key]: value } as Pick<AddressCacheConfig, K>);

const withOptionalDuration = <K extends keyof AddressCacheConfig>(
  key: K,
  value: number | undefined
): Partial<AddressCacheConfig> =>
  value === undefined
    ? {}
    : ({ [key]: millis(value) } as Pick<AddressCacheConfig, K>);

const buildCacheConfig = (options: {
  l1Capacity: number | undefined;
  l1TtlMs: number | undefined;
  l2BaseTtlMs: number | undefined;
  l2MinTtlMs: number | undefined;
  l2MaxTtlMs: number | undefined;
  l2SWRMs: number | undefined;
}): AddressCacheConfig => ({
  ...withOptionalValue("l1Capacity", options.l1Capacity),
  ...withOptionalDuration("l1Ttl", options.l1TtlMs),
  ...withOptionalDuration("l2BaseTtl", options.l2BaseTtlMs),
  ...withOptionalDuration("l2MinTtl", options.l2MinTtlMs),
  ...withOptionalDuration("l2MaxTtl", options.l2MaxTtlMs),
  ...withOptionalDuration("l2BaseSWR", options.l2SWRMs),
});

const buildNominatimConfig = (options: {
  baseUrl: string | undefined;
  email: string | undefined;
  referer: string | undefined;
  userAgent: string;
  defaultLimit: number | undefined;
}): NominatimConfig => {
  const config: NominatimConfig = { userAgent: options.userAgent };

  if (options.baseUrl) {
    config.baseUrl = options.baseUrl;
  }
  if (options.email) {
    config.email = options.email;
  }
  if (options.referer) {
    config.referer = options.referer;
  }
  if (options.defaultLimit !== undefined) {
    config.defaultLimit = options.defaultLimit;
  }

  return config;
};

const buildRadarAutocompleteConfig = (options: {
  apiKey: string | undefined;
  baseUrl: string | undefined;
  defaultLimit: number | undefined;
  layers: string | undefined;
  near: string | undefined;
  countryCode: string | undefined;
}): RadarAutocompleteConfig | null => {
  if (!options.apiKey) {
    return null;
  }

  const config: RadarAutocompleteConfig = { apiKey: options.apiKey };

  if (options.baseUrl) {
    config.baseUrl = options.baseUrl;
  }
  if (options.defaultLimit !== undefined) {
    config.defaultLimit = options.defaultLimit;
  }
  if (options.layers) {
    config.layers = options.layers;
  }
  if (options.near) {
    config.near = options.near;
  }
  if (options.countryCode) {
    config.countryCode = options.countryCode;
  }

  return config;
};

const buildHereDiscoverConfig = (options: {
  apiKey: string | undefined;
  baseUrl: string | undefined;
  defaultLimit: number | undefined;
  language: string | undefined;
  inArea: string | undefined;
  at: string | undefined;
  defaultAt: { lat: number; lng: number } | undefined;
}): HereDiscoverConfig | null => {
  if (!options.apiKey) {
    return null;
  }

  const config: HereDiscoverConfig = { apiKey: options.apiKey };

  if (options.baseUrl) {
    config.baseUrl = options.baseUrl;
  }
  if (options.defaultLimit !== undefined) {
    config.defaultLimit = options.defaultLimit;
  }
  if (options.language) {
    config.language = options.language;
  }
  if (options.inArea) {
    config.inArea = options.inArea;
  }

  const at = options.at ?? options.defaultAt;
  if (at) {
    config.at = at;
  }

  return config;
};

const buildSqliteConfig = (path: string | undefined): AddressSqliteConfig =>
  path ? { path } : {};

export const addressServiceConfig = rawConfig.pipe(
  Config.map((raw): AddressServiceConfig => {
    const defaultLimit = optionalValue(raw.defaultLimit);
    const nominatimRateLimitMs = optionalValue(raw.nominatimRateLimitMs);
    const l1Capacity = optionalValue(raw.l1Capacity);
    const l1TtlMs = optionalValue(raw.l1TtlMs);
    const l2BaseTtlMs = optionalValue(raw.l2BaseTtlMs);
    const l2MinTtlMs = optionalValue(raw.l2MinTtlMs);
    const l2MaxTtlMs = optionalValue(raw.l2MaxTtlMs);
    const l2SWRMs = optionalValue(raw.l2SWRMs);
    const radarDefaultLimit = optionalValue(raw.radarDefaultLimit);
    const radarRateLimitMs = optionalValue(raw.radarRateLimitMs);
    const hereDefaultLimit = optionalValue(raw.hereDefaultLimit);
    const hereDefaultLat = optionalValue(raw.hereDefaultLat);
    const hereDefaultLng = optionalValue(raw.hereDefaultLng);
    const hereRateLimitMs = optionalValue(raw.hereRateLimitMs);

    const nominatimUserAgent = trimmedOrDefault(
      raw.nominatimUserAgent,
      "smart-address-service"
    );

    const nominatimConfig = buildNominatimConfig({
      baseUrl: trimmedOptional(raw.nominatimBaseUrl),
      email: trimmedOptional(raw.nominatimEmail),
      referer: trimmedOptional(raw.nominatimReferer),
      userAgent: nominatimUserAgent,
      defaultLimit,
    });

    const radarAutocompleteConfig = buildRadarAutocompleteConfig({
      apiKey: redactedOptional(optionalValue(raw.radarApiKey)),
      baseUrl: trimmedOptionalFromOption(raw.radarBaseUrl),
      defaultLimit: radarDefaultLimit,
      layers: trimmedOptionalFromOption(raw.radarLayers),
      near: trimmedOptionalFromOption(raw.radarNear),
      countryCode: trimmedOptionalFromOption(raw.radarCountryCode),
    });

    const hereDiscoverConfig = buildHereDiscoverConfig({
      apiKey: redactedOptional(optionalValue(raw.hereApiKey)),
      baseUrl: trimmedOptionalFromOption(raw.hereBaseUrl),
      defaultLimit: hereDefaultLimit,
      language: trimmedOptionalFromOption(raw.hereLanguage),
      inArea: trimmedOptionalFromOption(raw.hereInArea),
      at: trimmedOptionalFromOption(raw.hereAt),
      defaultAt: defaultCoordinate(hereDefaultLat, hereDefaultLng),
    });

    const cacheConfig = buildCacheConfig({
      l1Capacity,
      l1TtlMs,
      l2BaseTtlMs,
      l2MinTtlMs,
      l2MaxTtlMs,
      l2SWRMs,
    });

    return {
      port: raw.port,
      providerTimeout: millis(raw.providerTimeoutMs),
      nominatimRateLimit: toRateLimit(nominatimRateLimitMs, seconds(1)),
      nominatim: nominatimConfig,
      radarAutocomplete: radarAutocompleteConfig,
      radarAutocompleteRateLimit: toRateLimit(radarRateLimitMs, null),
      hereDiscover: hereDiscoverConfig,
      hereDiscoverRateLimit: toRateLimit(hereRateLimitMs, null),
      cache: cacheConfig,
      sqlite: buildSqliteConfig(trimmedOptional(raw.sqlitePath)),
    };
  })
);
