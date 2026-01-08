import { layer as fetchHttpClientLayer } from "@effect/platform/FetchHttpClient";
import { serve } from "@effect/platform/HttpLayerRouter";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { AddressAcceptLogSqlite } from "./accept-log";
import {
  AddressCachedSuggestorLayer,
  AddressCacheStoreSqlite,
  AddressSuggestionCacheLayer,
} from "./cache";
import { addressServiceConfig } from "./config";
import { AddressMcpHandlersLayer, AddressMcpLayer } from "./mcp";
import { AddressMetricsLayer } from "./metrics";
import { makeOtelLayer } from "./otel";
import {
  type RequestEventConfig,
  RequestEventConfigLayer,
} from "./request-event";
import { AddressRoutesLayer } from "./routes";
import { AddressRpcServerLayer } from "./rpc";
import { AddressSearchLogSqlite } from "./search-log";
import { AddressSuggestorLayer } from "./service";

const serverLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* addressServiceConfig;
    const observability = config.observability;
    const metricsLayer = AddressMetricsLayer;
    const cacheStoreLayer = AddressCacheStoreSqlite(config.sqlite);
    const cacheLayer = AddressSuggestionCacheLayer(config.cache).pipe(
      Layer.provide(cacheStoreLayer),
      Layer.provide(metricsLayer)
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
        }).pipe(Layer.provide(metricsLayer))
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
      Layer.provide(AddressMcpHandlersLayer),
      Layer.provide(metricsLayer)
    );

    const otelLayer = makeOtelLayer({
      enabled: observability.otelEnabled,
      endpoint: observability.otelEndpoint,
      serviceName: observability.otelServiceName,
      serviceVersion: observability.otelServiceVersion,
    }).pipe(Layer.provide(fetchHttpClientLayer));

    const requestEventConfig: RequestEventConfig = {
      serviceName: observability.otelServiceName,
      serviceVersion: observability.otelServiceVersion,
      sampleRate: observability.wideEventSampleRate,
      slowThresholdMs: observability.wideEventSlowMs,
    };

    return serve(appLayer).pipe(
      Layer.provide(BunHttpServer.layer({ port: config.port })),
      Layer.provide(RequestEventConfigLayer(requestEventConfig)),
      Layer.provide(otelLayer)
    );
  })
);

BunRuntime.runMain(Layer.launch(serverLayer));
