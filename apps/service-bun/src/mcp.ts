import { Effect, Layer } from "effect"
import { McpServer, Tool, Toolkit } from "@effect/ai"
import { AddressSuggestionResultSchema } from "@smart-address/core/schema"
import {
  SuggestAddressErrorSchema,
  SuggestAddressPayloadSchema,
  type SuggestAddressPayload
} from "@smart-address/rpc/suggest"
import { AddressCachedSuggestor } from "./cache"
import { toSuggestRequest } from "./request"

const SuggestAddressTool = Tool.make("suggest-address", {
  description: "Suggest addresses using configured providers and strategies.",
  parameters: SuggestAddressPayloadSchema.fields,
  success: AddressSuggestionResultSchema,
  failure: SuggestAddressErrorSchema,
  dependencies: [AddressCachedSuggestor]
})

export const AddressMcpToolkit = Toolkit.make(SuggestAddressTool)

const handleSuggestAddress = (payload: SuggestAddressPayload) =>
  Effect.gen(function* () {
    const suggestor = yield* AddressCachedSuggestor
    const request = yield* toSuggestRequest(payload)
    return yield* suggestor.suggest(request)
  }).pipe(Effect.mapError((error) => ({ message: error.message })))

export const AddressMcpHandlersLayer = AddressMcpToolkit.toLayer({
  "suggest-address": handleSuggestAddress
})

const McpHttpLayer = McpServer.layerHttpRouter({
  name: "smart-address-service",
  version: "0.1.0",
  path: "/mcp"
})

const AddressMcpRegistrationLayer = Layer.effectDiscard(
  McpServer.registerToolkit(AddressMcpToolkit)
).pipe(Layer.provide(AddressMcpHandlersLayer), Layer.provide(McpHttpLayer))

export const AddressMcpLayer = Layer.mergeAll(
  AddressMcpHandlersLayer,
  McpHttpLayer,
  AddressMcpRegistrationLayer
)
