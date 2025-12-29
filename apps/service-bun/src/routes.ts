import { Effect, Layer } from "effect"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { AddressCachedSuggestor } from "./cache"
import { handleLegacyDemo, handleSdkModule } from "./demo"
import { handleSuggestGet, handleSuggestPost, optionsResponse } from "./http"

export const AddressRoutesLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpLayerRouter.HttpRouter
    const suggestor = yield* AddressCachedSuggestor

    yield* router.add("GET", "/health", HttpServerResponse.text("ok"))
    yield* router.add("GET", "/demo/legacy", handleLegacyDemo)
    yield* router.add("GET", "/demo/sdk.js", handleSdkModule)
    yield* router.add("GET", "/suggest", handleSuggestGet(suggestor))
    yield* router.add("POST", "/suggest", handleSuggestPost(suggestor))
    yield* router.add("OPTIONS", "/suggest", optionsResponse)
    yield* router.add("OPTIONS", "/mcp", optionsResponse)
  })
)
