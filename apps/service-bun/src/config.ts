import { Config, Option } from "effect"
import * as Duration from "effect/Duration"
import type { NominatimConfig } from "@smart-address/integrations/nominatim"
import type { AddressCacheConfig } from "./cache"
import type { AddressSqliteConfig } from "./sqlite"

export type AddressServiceConfig = {
  readonly port: number
  readonly providerTimeout: Duration.Duration
  readonly nominatimRateLimit: Duration.Duration | null
  readonly nominatim: NominatimConfig
  readonly cache: AddressCacheConfig
  readonly sqlite: AddressSqliteConfig
}

const rawConfig = Config.all({
  port: Config.port("PORT").pipe(Config.withDefault(8787)),
  providerTimeoutMs: Config.integer("PROVIDER_TIMEOUT_MS").pipe(Config.withDefault(4000)),
  defaultLimit: Config.option(Config.integer("NOMINATIM_DEFAULT_LIMIT")),
  nominatimRateLimitMs: Config.option(Config.integer("NOMINATIM_RATE_LIMIT_MS")),
  l1Capacity: Config.option(Config.integer("CACHE_L1_CAPACITY")),
  l1TtlMs: Config.option(Config.integer("CACHE_L1_TTL_MS")),
  l2BaseTtlMs: Config.option(Config.integer("CACHE_L2_BASE_TTL_MS")),
  l2MinTtlMs: Config.option(Config.integer("CACHE_L2_MIN_TTL_MS")),
  l2MaxTtlMs: Config.option(Config.integer("CACHE_L2_MAX_TTL_MS")),
  l2SWRMs: Config.option(Config.integer("CACHE_L2_SWR_MS")),
  nominatimBaseUrl: Config.string("NOMINATIM_BASE_URL").pipe(Config.withDefault("")),
  nominatimEmail: Config.string("NOMINATIM_EMAIL").pipe(Config.withDefault("")),
  nominatimReferer: Config.string("NOMINATIM_REFERER").pipe(Config.withDefault("")),
  nominatimUserAgent: Config.string("NOMINATIM_USER_AGENT").pipe(
    Config.withDefault("smart-address-service")
  ),
  sqlitePath: Config.string("SMART_ADDRESS_DB_PATH").pipe(Config.withDefault(""))
})

export const addressServiceConfig = rawConfig.pipe(
  Config.map((raw): AddressServiceConfig => {
    const defaultLimit = Option.getOrUndefined(raw.defaultLimit)
    const nominatimRateLimitMs = Option.getOrUndefined(raw.nominatimRateLimitMs)
    const l1Capacity = Option.getOrUndefined(raw.l1Capacity)
    const l1TtlMs = Option.getOrUndefined(raw.l1TtlMs)
    const l2BaseTtlMs = Option.getOrUndefined(raw.l2BaseTtlMs)
    const l2MinTtlMs = Option.getOrUndefined(raw.l2MinTtlMs)
    const l2MaxTtlMs = Option.getOrUndefined(raw.l2MaxTtlMs)
    const l2SWRMs = Option.getOrUndefined(raw.l2SWRMs)

    const nominatimBaseUrl = raw.nominatimBaseUrl.trim() || undefined
    const nominatimEmail = raw.nominatimEmail.trim() || undefined
    const nominatimReferer = raw.nominatimReferer.trim() || undefined
    const nominatimUserAgent = raw.nominatimUserAgent.trim() || "smart-address-service"
    const sqlitePath = raw.sqlitePath.trim() || undefined

    const nominatimConfig: NominatimConfig = {
      userAgent: nominatimUserAgent,
      ...(nominatimBaseUrl !== undefined ? { baseUrl: nominatimBaseUrl } : {}),
      ...(nominatimEmail !== undefined ? { email: nominatimEmail } : {}),
      ...(nominatimReferer !== undefined ? { referer: nominatimReferer } : {}),
      ...(defaultLimit !== undefined ? { defaultLimit } : {})
    }

    const nominatimRateLimit =
      nominatimRateLimitMs === undefined
        ? Duration.seconds(1)
        : nominatimRateLimitMs <= 0
          ? null
          : Duration.millis(nominatimRateLimitMs)

    const cacheConfig: AddressCacheConfig = {
      ...(l1Capacity !== undefined ? { l1Capacity } : {}),
      ...(l1TtlMs ? { l1Ttl: Duration.millis(l1TtlMs) } : {}),
      ...(l2BaseTtlMs ? { l2BaseTtl: Duration.millis(l2BaseTtlMs) } : {}),
      ...(l2MinTtlMs ? { l2MinTtl: Duration.millis(l2MinTtlMs) } : {}),
      ...(l2MaxTtlMs ? { l2MaxTtl: Duration.millis(l2MaxTtlMs) } : {}),
      ...(l2SWRMs ? { l2BaseSWR: Duration.millis(l2SWRMs) } : {})
    }

    const sqliteConfig = sqlitePath === undefined ? {} : { path: sqlitePath }

    return {
      port: raw.port,
      providerTimeout: Duration.millis(raw.providerTimeoutMs),
      nominatimRateLimit,
      nominatim: nominatimConfig,
      cache: cacheConfig,
      sqlite: sqliteConfig
    }
  })
)
