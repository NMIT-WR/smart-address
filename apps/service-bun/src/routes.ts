import { HttpRouter } from "@effect/platform/HttpLayerRouter";
import { text } from "@effect/platform/HttpServerResponse";
import { Effect, Layer } from "effect";
import { AddressAcceptLog } from "./accept-log";
import { AddressCachedSuggestor } from "./cache";
import { handleLegacyDemo, handleSdkModule } from "./demo";
import {
  handleAcceptPost,
  handleMetricsGet,
  handleSuggestGet,
  handleSuggestPost,
  optionsResponse,
} from "./http";
import { AddressMetrics } from "./metrics";

export const AddressRoutesLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpRouter;
    const suggestor = yield* AddressCachedSuggestor;
    const acceptLog = yield* AddressAcceptLog;
    const metrics = yield* AddressMetrics;

    yield* router.add("GET", "/health", text("ok"));
    yield* router.add("GET", "/demo/legacy", handleLegacyDemo);
    yield* router.add("GET", "/demo/sdk.js", handleSdkModule);
    yield* router.add("GET", "/suggest", handleSuggestGet(suggestor));
    yield* router.add("POST", "/suggest", handleSuggestPost(suggestor));
    yield* router.add("POST", "/accept", handleAcceptPost(acceptLog));
    yield* router.add("GET", "/metrics", handleMetricsGet(metrics));
    yield* router.add("OPTIONS", "/suggest", optionsResponse);
    yield* router.add("OPTIONS", "/accept", optionsResponse);
    yield* router.add("OPTIONS", "/metrics", optionsResponse);
    yield* router.add("OPTIONS", "/mcp", optionsResponse);
  })
);
