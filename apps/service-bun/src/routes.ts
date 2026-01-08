import { HttpRouter } from "@effect/platform/HttpLayerRouter";
import { text } from "@effect/platform/HttpServerResponse";
import { Effect, Layer } from "effect";
import { AddressAcceptLog } from "./accept-log";
import { AddressCachedSuggestor } from "./cache";
import { handleLegacyDemo, handleSdkModule } from "./demo";
import {
  handleAcceptPost,
  handleMetricsGet,
  handleOptions,
  handleSuggestGet,
  handleSuggestPost,
  withHttpRequestEvent,
} from "./http";
import { AddressMetrics } from "./metrics";

export const AddressRoutesLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpRouter;
    const suggestor = yield* AddressCachedSuggestor;
    const acceptLog = yield* AddressAcceptLog;
    const metrics = yield* AddressMetrics;

    const healthHandler = withHttpRequestEvent({ kind: "health" }, () =>
      Effect.succeed(text("ok"))
    );
    const legacyHandler = withHttpRequestEvent({ kind: "demo.legacy" }, () =>
      Effect.succeed(handleLegacyDemo())
    );
    const sdkHandler = withHttpRequestEvent({ kind: "demo.sdk" }, () =>
      handleSdkModule()
    );

    yield* router.add("GET", "/health", healthHandler);
    yield* router.add("GET", "/demo/legacy", legacyHandler);
    yield* router.add("GET", "/demo/sdk.js", sdkHandler);
    yield* router.add("GET", "/suggest", handleSuggestGet(suggestor));
    yield* router.add("POST", "/suggest", handleSuggestPost(suggestor));
    yield* router.add("POST", "/accept", handleAcceptPost(acceptLog));
    yield* router.add("GET", "/metrics", handleMetricsGet(metrics));
    yield* router.add("OPTIONS", "/suggest", handleOptions);
    yield* router.add("OPTIONS", "/accept", handleOptions);
    yield* router.add("OPTIONS", "/metrics", handleOptions);
    yield* router.add("OPTIONS", "/mcp", handleOptions);
  })
);
