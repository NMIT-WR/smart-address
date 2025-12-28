import { Effect, Layer } from "effect"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { AddressCachedSuggestor } from "./cache"
import { handleSuggestGet, handleSuggestPost, optionsResponse, type SuggestAuthConfig } from "./http"

export type AddressRoutesConfig = SuggestAuthConfig

export const AddressRoutesLayer = (config: AddressRoutesConfig) =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const router = yield* HttpLayerRouter.HttpRouter
      const suggestor = yield* AddressCachedSuggestor

      yield* router.add("GET", "/health", HttpServerResponse.text("ok"))
      yield* router.add("GET", "/suggest", handleSuggestGet(suggestor, config))
      yield* router.add("POST", "/suggest", handleSuggestPost(suggestor, config))
      yield* router.add("OPTIONS", "/suggest", optionsResponse)
      yield* router.add("OPTIONS", "/mcp", optionsResponse)
    })
  )
