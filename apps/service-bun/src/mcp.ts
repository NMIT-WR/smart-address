import { McpServer, Tool, Toolkit } from "@effect/ai";
import { AddressSuggestionResultSchema } from "@smart-address/core/schema";
import {
  SuggestAddressErrorSchema,
  type SuggestAddressPayload,
  SuggestAddressPayloadSchema,
} from "@smart-address/rpc/suggest";
import { Effect, Layer } from "effect";
import { AddressCachedSuggestor } from "./cache";
import { toSuggestRequest } from "./request";
import { makeRequestId, RequestEventConfig } from "./request-event";
import { recordSuggestFromContext } from "./request-event-context";
import { makeSuggestEventInit, runRequestEvent } from "./request-event-runner";

const SuggestAddressTool = Tool.make("suggest-address", {
  description: "Suggest addresses using configured providers and strategies.",
  parameters: SuggestAddressPayloadSchema.fields,
  success: AddressSuggestionResultSchema,
  failure: SuggestAddressErrorSchema,
  dependencies: [AddressCachedSuggestor, RequestEventConfig],
});

export const AddressMcpToolkit = Toolkit.make(SuggestAddressTool);

const handleSuggestAddress = (payload: SuggestAddressPayload) =>
  Effect.gen(function* () {
    const requestId = makeRequestId();

    const effect = Effect.gen(function* () {
      const suggestor = yield* AddressCachedSuggestor;
      const request = yield* toSuggestRequest(payload);
      yield* recordSuggestFromContext(request);
      return yield* suggestor.suggest(request);
    }).pipe(Effect.mapError((error) => ({ message: error.message })));

    return yield* runRequestEvent(
      makeSuggestEventInit({
        requestId,
        kind: "mcp.suggest",
        source: "mcp",
        method: "MCP",
        path: "/mcp/suggest-address",
        spanName: "mcp suggest-address",
      }),
      effect
    );
  });

export const AddressMcpHandlersLayer = AddressMcpToolkit.toLayer({
  "suggest-address": handleSuggestAddress,
});

const McpHttpLayer = McpServer.layerHttpRouter({
  name: "smart-address-service",
  version: "0.1.0",
  path: "/mcp",
});

const AddressMcpRegistrationLayer = Layer.effectDiscard(
  McpServer.registerToolkit(AddressMcpToolkit)
).pipe(Layer.provide(AddressMcpHandlersLayer), Layer.provide(McpHttpLayer));

export const AddressMcpLayer = Layer.mergeAll(
  AddressMcpHandlersLayer,
  McpHttpLayer,
  AddressMcpRegistrationLayer
);
