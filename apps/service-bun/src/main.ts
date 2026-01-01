import { layer as fetchHttpClientLayer } from "@effect/platform/FetchHttpClient";
import { serve } from "@effect/platform/HttpLayerRouter";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import {
  AddressCachedSuggestorLayer,
  AddressCacheStoreSqlite,
  AddressSuggestionCacheLayer,
} from "./cache";
import { addressServiceConfig } from "./config";
import { AddressMcpHandlersLayer, AddressMcpLayer } from "./mcp";
import { AddressRoutesLayer } from "./routes";
import { AddressRpcServerLayer } from "./rpc";
import { AddressAcceptLogSqlite } from "./accept-log";
import { AddressSearchLogSqlite } from "./search-log";
import { AddressSuggestorLayer } from "./service";

const serverLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* addressServiceConfig;
    const cacheStoreLayer = AddressCacheStoreSqlite(config.sqlite);
    const cacheLayer = AddressSuggestionCacheLayer(config.cache).pipe(
      Layer.provide(cacheStoreLayer)
    );
    const acceptLogLayer = AddressAcceptLogSqlite(config.sqlite);
    const suggestorLayer = AddressCachedSuggestorLayer.pipe(
      Layer.provide(
        AddressSuggestorLayer({
          nominatim: config.nominatim,
          providerTimeout: config.providerTimeout,
          nominatimRateLimit: config.nominatimRateLimit,
          radarAutocomplete: config.radarAutocomplete,
          radarAutocompleteRateLimit: config.radarAutocompleteRateLimit,
          hereDiscover: config.hereDiscover,
          hereDiscoverRateLimit: config.hereDiscoverRateLimit,
        })
      ),
      Layer.provide(cacheLayer),
      Layer.provide(fetchHttpClientLayer),
      Layer.provide(AddressSearchLogSqlite(config.sqlite))
    );

    const appLayer = Layer.mergeAll(
      AddressRoutesLayer,
      AddressRpcServerLayer,
      AddressMcpLayer
    ).pipe(
      Layer.provide(suggestorLayer),
      Layer.provide(acceptLogLayer),
      Layer.provide(AddressMcpHandlersLayer)
    );

    return serve(appLayer).pipe(
      Layer.provide(BunHttpServer.layer({ port: config.port }))
    );
  })
);

BunRuntime.runMain(Layer.launch(serverLayer));
