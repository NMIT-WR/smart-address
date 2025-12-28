import { Config, Context, Effect, Layer, Option } from "effect"
import * as Duration from "effect/Duration"
import type { NominatimConfig } from "@smart-address/integrations/nominatim"
import type { AddressCacheConfig } from "./cache"
import type { AddressSqliteConfig } from "./sqlite"

const optionalString = (key: string) =>
  Config.option(Config.string(key)).pipe(
    Config.map((value) =>
      Option.match(value, {
        onNone: () => undefined,
        onSome: (text) => {
          const trimmed = text.trim()
          return trimmed.length === 0 ? undefined : trimmed
        }
      })
    )
  )

const optionalInteger = (key: string) =>
  Config.option(Config.integer(key)).pipe(
    Config.map((value) =>
      Option.match(value, {
        onNone: () => undefined,
        onSome: (number) => number
      })
    )
  )

export interface AddressServiceConfig {
  readonly port: number
  readonly providerTimeout: Duration.Duration
  readonly nominatimRateLimit: Duration.Duration | null
  readonly nominatim: NominatimConfig
  readonly cache: AddressCacheConfig
  readonly sqlite: AddressSqliteConfig
}

export class AddressServiceConfig extends Context.Tag("@smart-address/service-bun/Config")<
  AddressServiceConfig,
  AddressServiceConfig
>() {
  static readonly layer = Layer.effect(
    AddressServiceConfig,
    Effect.gen(function* () {
      const port = yield* Config.integer("PORT").pipe(
        Config.orElse(() => Config.succeed(8787))
      )
      const providerTimeoutMs = yield* Config.integer("PROVIDER_TIMEOUT_MS").pipe(
        Config.orElse(() => Config.succeed(4000))
      )
      const defaultLimit = yield* optionalInteger("NOMINATIM_DEFAULT_LIMIT")
      const nominatimRateLimitMs = yield* optionalInteger("NOMINATIM_RATE_LIMIT_MS")
      const l1Capacity = yield* optionalInteger("CACHE_L1_CAPACITY")
      const l1TtlMs = yield* optionalInteger("CACHE_L1_TTL_MS")
      const l2BaseTtlMs = yield* optionalInteger("CACHE_L2_BASE_TTL_MS")
      const l2MinTtlMs = yield* optionalInteger("CACHE_L2_MIN_TTL_MS")
      const l2MaxTtlMs = yield* optionalInteger("CACHE_L2_MAX_TTL_MS")
      const l2SWRMs = yield* optionalInteger("CACHE_L2_SWR_MS")

      const nominatimBaseUrl = yield* optionalString("NOMINATIM_BASE_URL")
      const nominatimEmail = yield* optionalString("NOMINATIM_EMAIL")
      const nominatimReferer = yield* optionalString("NOMINATIM_REFERER")
      const nominatimUserAgent = yield* optionalString("NOMINATIM_USER_AGENT").pipe(
        Config.map((value) => value ?? "smart-address-service")
      )

      const sqlitePath = yield* optionalString("SMART_ADDRESS_DB_PATH")
      const sqliteConfig = sqlitePath === undefined ? {} : { path: sqlitePath }

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

      return AddressServiceConfig.of({
        port,
        providerTimeout: Duration.millis(providerTimeoutMs),
        nominatimRateLimit,
        nominatim: nominatimConfig,
        cache: cacheConfig,
        sqlite: sqliteConfig
      })
    })
  )
}
