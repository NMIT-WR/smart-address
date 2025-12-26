import { Effect, Layer } from "effect"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { handleSuggestGet, handleSuggestPost, optionsResponse } from "./http"

export const AddressRoutesLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpLayerRouter.HttpRouter

    yield* router.add("GET", "/health", HttpServerResponse.text("ok"))
    yield* router.add("GET", "/suggest", handleSuggestGet)
    yield* router.add("POST", "/suggest", handleSuggestPost)
    yield* router.add("OPTIONS", "/suggest", optionsResponse)
    yield* router.add("OPTIONS", "/mcp", optionsResponse)
  })
)
