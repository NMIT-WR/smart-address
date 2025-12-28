import { Layer } from "effect"
import * as Duration from "effect/Duration"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { AddressSuggestorLayer } from "./service"
import {
  AddressCacheStoreSqlite,
  AddressCachedSuggestorLayer,
  AddressSuggestionCacheLayer
} from "./cache"
import { AddressRoutesLayer } from "./routes"
import { AddressRpcServerLayer } from "./rpc"
import { AddressMcpHandlersLayer, AddressMcpLayer } from "./mcp"
import { AddressSearchLogSqlite } from "./search-log"

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseOptionalString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const port = parseNumber(Bun.env.PORT) ?? 8787
const timeoutMs = parseNumber(Bun.env.PROVIDER_TIMEOUT_MS) ?? 4000
const defaultLimit = parseNumber(Bun.env.NOMINATIM_DEFAULT_LIMIT)
const nominatimRateLimitMs = parseNumber(Bun.env.NOMINATIM_RATE_LIMIT_MS)
const l1Capacity = parseNumber(Bun.env.CACHE_L1_CAPACITY)
const l1TtlMs = parseNumber(Bun.env.CACHE_L1_TTL_MS)
const l2BaseTtlMs = parseNumber(Bun.env.CACHE_L2_BASE_TTL_MS)
const l2MinTtlMs = parseNumber(Bun.env.CACHE_L2_MIN_TTL_MS)
const l2MaxTtlMs = parseNumber(Bun.env.CACHE_L2_MAX_TTL_MS)
const l2SWRMs = parseNumber(Bun.env.CACHE_L2_SWR_MS)

const nominatimBaseUrl = parseOptionalString(Bun.env.NOMINATIM_BASE_URL)
const nominatimEmail = parseOptionalString(Bun.env.NOMINATIM_EMAIL)
const nominatimReferer = parseOptionalString(Bun.env.NOMINATIM_REFERER)
const nominatimUserAgent = parseOptionalString(Bun.env.NOMINATIM_USER_AGENT) ?? "smart-address-service"

const nominatimConfig = {
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

const cacheConfig = {
  ...(l1Capacity !== undefined ? { l1Capacity } : {}),
  ...(l1TtlMs ? { l1Ttl: Duration.millis(l1TtlMs) } : {}),
  ...(l2BaseTtlMs ? { l2BaseTtl: Duration.millis(l2BaseTtlMs) } : {}),
  ...(l2MinTtlMs ? { l2MinTtl: Duration.millis(l2MinTtlMs) } : {}),
  ...(l2MaxTtlMs ? { l2MaxTtl: Duration.millis(l2MaxTtlMs) } : {}),
  ...(l2SWRMs ? { l2BaseSWR: Duration.millis(l2SWRMs) } : {})
}

const sqlitePath = parseOptionalString(Bun.env.SMART_ADDRESS_DB_PATH)
const sqliteConfig = sqlitePath === undefined ? {} : { path: sqlitePath }

const cacheStoreLayer = AddressCacheStoreSqlite(sqliteConfig)

const cacheLayer = AddressSuggestionCacheLayer(cacheConfig).pipe(Layer.provide(cacheStoreLayer))

const suggestorLayer = AddressCachedSuggestorLayer.pipe(
  Layer.provide(
    AddressSuggestorLayer({
      nominatim: nominatimConfig,
      providerTimeout: Duration.millis(timeoutMs),
      nominatimRateLimit
    })
  ),
  Layer.provide(cacheLayer),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(AddressSearchLogSqlite(sqliteConfig))
)

const appLayer = Layer.mergeAll(AddressRoutesLayer, AddressRpcServerLayer, AddressMcpLayer).pipe(
  Layer.provide(suggestorLayer),
  Layer.provide(AddressMcpHandlersLayer)
)

const serverLayer = HttpLayerRouter.serve(appLayer).pipe(
  Layer.provide(BunHttpServer.layer({ port }))
)

BunRuntime.runMain(Layer.launch(serverLayer))
