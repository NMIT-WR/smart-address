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
import { AddressServiceConfig } from "./config"

const appLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* AddressServiceConfig
    const cacheStoreLayer = AddressCacheStoreSqlite(config.sqlite)
    const cacheLayer = AddressSuggestionCacheLayer(config.cache).pipe(Layer.provide(cacheStoreLayer))
    const suggestorLayer = AddressCachedSuggestorLayer.pipe(
      Layer.provide(
        AddressSuggestorLayer({
          nominatim: config.nominatim,
          providerTimeout: config.providerTimeout,
          nominatimRateLimit: config.nominatimRateLimit
        })
      ),
      Layer.provide(cacheLayer),
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(AddressSearchLogSqlite(config.sqlite))
    )

    return Layer.mergeAll(AddressRoutesLayer, AddressRpcServerLayer, AddressMcpLayer).pipe(
      Layer.provide(suggestorLayer),
      Layer.provide(AddressMcpHandlersLayer)
    )
  })
)

const serverLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* AddressServiceConfig
    return HttpLayerRouter.serve(appLayer).pipe(
      Layer.provide(BunHttpServer.layer({ port: config.port }))
    )
  })
).pipe(Layer.provide(AddressServiceConfig.layer))

BunRuntime.runMain(Layer.launch(serverLayer))
