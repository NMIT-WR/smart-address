import { Effect, Layer } from "effect"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { AddressCachedSuggestor } from "./cache"
import { handleSuggestGet, handleSuggestPost, optionsResponse, SuggestAuth } from "./http"

export const AddressRoutesLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpLayerRouter.HttpRouter
    const suggestor = yield* AddressCachedSuggestor
    const auth = yield* SuggestAuth

    yield* router.add("GET", "/health", HttpServerResponse.text("ok"))
    yield* router.add("GET", "/suggest", handleSuggestGet(suggestor, auth))
    yield* router.add("POST", "/suggest", handleSuggestPost(suggestor, auth))
    yield* router.add("OPTIONS", "/suggest", optionsResponse)
    yield* router.add("OPTIONS", "/mcp", optionsResponse)
  })
)
