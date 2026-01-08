import type { HereDiscoverConfig } from "@smart-address/integrations/here-discover";
import type { NominatimConfig } from "@smart-address/integrations/nominatim";
import type { RadarAutocompleteConfig } from "@smart-address/integrations/radar-autocomplete";
import { Config, Option, Redacted } from "effect";
import { type Duration, millis, seconds } from "effect/Duration";
import type { AddressCacheConfig } from "./cache";
import type { AddressSqliteConfig } from "./sqlite";

interface AddressServiceConfig {
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
  readonly observability: {
    readonly otelEnabled: boolean;
    readonly otelEndpoint: string;
    readonly otelServiceName: string;
    readonly otelServiceVersion?: string;
    readonly wideEventSampleRate: number;
    readonly wideEventSlowMs: number;
    readonly logRawQuery: boolean;
  };
}

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
  otelEnabled: Config.boolean("SMART_ADDRESS_OTEL_ENABLED").pipe(
    Config.withDefault(true)
  ),
  otelEndpoint: Config.string("OTEL_EXPORTER_OTLP_ENDPOINT").pipe(
    Config.withDefault("http://localhost:4318")
  ),
  otelServiceName: Config.string("OTEL_SERVICE_NAME").pipe(
    Config.withDefault("smart-address-service")
  ),
  otelServiceVersion: Config.option(Config.string("OTEL_SERVICE_VERSION")),
  wideEventSampleRate: Config.option(
    Config.number("SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE")
  ),
  wideEventSlowMs: Config.integer("SMART_ADDRESS_WIDE_EVENT_SLOW_MS").pipe(
    Config.withDefault(2000)
  ),
  logRawQuery: Config.option(Config.boolean("SMART_ADDRESS_LOG_RAW_QUERY")),
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

const buildProviderBaseConfig = (options: {
  baseUrl: string | undefined;
  defaultLimit: number | undefined;
}) => ({
  ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
  ...(options.defaultLimit !== undefined
    ? { defaultLimit: options.defaultLimit }
    : {}),
});

const trimmedOrDefault = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const otelEndpointTrimTrailingSlashes = /\/+$/;

const normalizeOtelEndpoint = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "http://localhost:4318/v1/traces";
  }
  if (trimmed.endsWith("/v1/traces")) {
    return trimmed;
  }
  return `${trimmed.replace(otelEndpointTrimTrailingSlashes, "")}/v1/traces`;
};

const currentNodeEnv = (): string =>
  (typeof Bun !== "undefined" ? Bun.env.NODE_ENV : undefined) ??
  globalThis.process?.env?.NODE_ENV ??
  "";

const isProductionEnv = (): boolean =>
  currentNodeEnv().toLowerCase() === "production";

const defaultSampleRate = (): number => (isProductionEnv() ? 0.05 : 1);

const defaultLogRawQuery = (): boolean => !isProductionEnv();

const clampSampleRate = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : defaultSampleRate();

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

const withOptionalValue = <K extends keyof AddressCacheConfig>(
  key: K,
  value: AddressCacheConfig[K] | undefined
): Partial<AddressCacheConfig> =>
  value === undefined ? {} : ({ [key]: value } as Partial<AddressCacheConfig>);

const withOptionalDuration = <K extends keyof AddressCacheConfig>(
  key: K,
  value: number | undefined
): Partial<AddressCacheConfig> =>
  value === undefined
    ? {}
    : ({ [key]: millis(value) } as Partial<AddressCacheConfig>);

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
}): NominatimConfig => ({
  userAgent: options.userAgent,
  ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
  ...(options.email ? { email: options.email } : {}),
  ...(options.referer ? { referer: options.referer } : {}),
  ...(options.defaultLimit !== undefined
    ? { defaultLimit: options.defaultLimit }
    : {}),
});

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

  return {
    apiKey: options.apiKey,
    ...buildProviderBaseConfig(options),
    ...(options.layers ? { layers: options.layers } : {}),
    ...(options.near ? { near: options.near } : {}),
    ...(options.countryCode ? { countryCode: options.countryCode } : {}),
  };
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

  const at = options.at ?? options.defaultAt;
  return {
    apiKey: options.apiKey,
    ...buildProviderBaseConfig(options),
    ...(options.language ? { language: options.language } : {}),
    ...(options.inArea ? { inArea: options.inArea } : {}),
    ...(at ? { at } : {}),
  };
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
    const wideEventSampleRate = clampSampleRate(
      optionalValue(raw.wideEventSampleRate) ?? defaultSampleRate()
    );
    const logRawQuery = optionalValue(raw.logRawQuery) ?? defaultLogRawQuery();

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

    const otelServiceVersion = trimmedOptionalFromOption(
      raw.otelServiceVersion
    );

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
      observability: {
        otelEnabled: raw.otelEnabled,
        otelEndpoint: normalizeOtelEndpoint(raw.otelEndpoint),
        otelServiceName: trimmedOrDefault(
          raw.otelServiceName,
          "smart-address-service"
        ),
        ...(otelServiceVersion ? { otelServiceVersion } : {}),
        wideEventSampleRate,
        wideEventSlowMs: Math.max(0, raw.wideEventSlowMs),
        logRawQuery,
      },
    };
  })
);
