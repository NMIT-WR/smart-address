import { Layer } from "effect"
import * as Duration from "effect/Duration"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { AddressSuggestorLayer } from "./service"
import {
  AddressCacheStoreMemory,
  AddressCacheStoreRedis,
  AddressCachedSuggestorLayer,
  AddressSuggestionCacheLayer
} from "./cache"
import { AddressRoutesLayer } from "./routes"
import { AddressRpcServerLayer } from "./rpc"
import { AddressMcpLayer } from "./mcp"

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
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

const nominatimConfig = {
  baseUrl: Bun.env.NOMINATIM_BASE_URL,
  userAgent: Bun.env.NOMINATIM_USER_AGENT ?? "smart-address-service",
  email: Bun.env.NOMINATIM_EMAIL,
  referer: Bun.env.NOMINATIM_REFERER,
  defaultLimit
}

const nominatimRateLimit =
  nominatimRateLimitMs === undefined
    ? Duration.seconds(1)
    : nominatimRateLimitMs <= 0
      ? null
      : Duration.millis(nominatimRateLimitMs)

const cacheConfig = {
  l1Capacity: l1Capacity ?? undefined,
  l1Ttl: l1TtlMs ? Duration.millis(l1TtlMs) : undefined,
  l2BaseTtl: l2BaseTtlMs ? Duration.millis(l2BaseTtlMs) : undefined,
  l2MinTtl: l2MinTtlMs ? Duration.millis(l2MinTtlMs) : undefined,
  l2MaxTtl: l2MaxTtlMs ? Duration.millis(l2MaxTtlMs) : undefined,
  l2BaseSWR: l2SWRMs ? Duration.millis(l2SWRMs) : undefined
}

const redisConfig =
  Bun.env.UPSTASH_REDIS_REST_URL && Bun.env.UPSTASH_REDIS_REST_TOKEN
    ? {
        url: Bun.env.UPSTASH_REDIS_REST_URL,
        token: Bun.env.UPSTASH_REDIS_REST_TOKEN,
        prefix: Bun.env.CACHE_REDIS_PREFIX
      }
    : null

const appLayer = Layer.mergeAll(AddressRoutesLayer, AddressRpcServerLayer, AddressMcpLayer)

const serverLayer = HttpLayerRouter.serve(appLayer).pipe(
  Layer.provide(BunHttpServer.layer({ port })),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(
    AddressSuggestorLayer({
      nominatim: nominatimConfig,
      providerTimeout: Duration.millis(timeoutMs),
      nominatimRateLimit
    })
  ),
  Layer.provide(AddressSuggestionCacheLayer(cacheConfig)),
  Layer.provide(AddressCachedSuggestorLayer),
  Layer.provide(redisConfig ? AddressCacheStoreRedis(redisConfig) : AddressCacheStoreMemory)
)

BunRuntime.runMain(Layer.launch(serverLayer))
