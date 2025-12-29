import { Effect, Layer } from "effect"
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
import { addressServiceConfig } from "./config"

const serverLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* addressServiceConfig
    const cacheStoreLayer = AddressCacheStoreSqlite(config.sqlite)
    const cacheLayer = AddressSuggestionCacheLayer(config.cache).pipe(Layer.provide(cacheStoreLayer))
    const suggestorLayer = AddressCachedSuggestorLayer.pipe(
      Layer.provide(
        AddressSuggestorLayer({
          nominatim: config.nominatim,
          here: config.here,
          providerTimeout: config.providerTimeout,
          nominatimRateLimit: config.nominatimRateLimit,
          hereRateLimit: config.hereRateLimit
        })
      ),
      Layer.provide(cacheLayer),
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(AddressSearchLogSqlite(config.sqlite))
    )

    const appLayer = Layer.mergeAll(AddressRoutesLayer, AddressRpcServerLayer, AddressMcpLayer).pipe(
      Layer.provide(suggestorLayer),
      Layer.provide(AddressMcpHandlersLayer)
    )

    return HttpLayerRouter.serve(appLayer).pipe(
      Layer.provide(BunHttpServer.layer({ port: config.port }))
    )
  })
)

BunRuntime.runMain(Layer.launch(serverLayer))
