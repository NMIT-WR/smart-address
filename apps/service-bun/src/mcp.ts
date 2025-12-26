import { Effect, Layer } from "effect"
import { McpServer, Tool, Toolkit } from "@effect/ai"
import { AddressSuggestionResultSchema } from "@smart-address/core/schema"
import {
  SuggestAddressPayloadSchema,
  type SuggestAddressPayload
} from "@smart-address/rpc/suggest"
import { AddressCachedSuggestor } from "./cache"
import { toSuggestRequest } from "./request"

const SuggestAddressTool = Tool.make("suggest-address", {
  description: "Suggest addresses using configured providers and strategies.",
  parameters: SuggestAddressPayloadSchema.fields,
  success: AddressSuggestionResultSchema
})

export const AddressMcpToolkit = Toolkit.make(SuggestAddressTool)

const handleSuggestAddress = (payload: SuggestAddressPayload) =>
  Effect.flatMap(AddressCachedSuggestor, (suggestor) =>
    toSuggestRequest(payload).pipe(Effect.flatMap((request) => suggestor.suggest(request)))
  )

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
