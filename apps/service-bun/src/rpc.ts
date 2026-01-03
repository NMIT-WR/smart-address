import { layerJson } from "@effect/rpc/RpcSerialization";
import { layerHttpRouter } from "@effect/rpc/RpcServer";
import { SuggestAddressRpcGroup } from "@smart-address/rpc/suggest";
import { Effect, Layer } from "effect";
import { AddressCachedSuggestor } from "./cache";
import { toSuggestRequest } from "./request";

const AddressRpcHandlers = SuggestAddressRpcGroup.toLayer(
  Effect.gen(function* () {
    const suggestor = yield* AddressCachedSuggestor;
    return SuggestAddressRpcGroup.of({
      "suggest-address": (payload) =>
        toSuggestRequest(payload).pipe(
          Effect.mapError((error) => ({ message: error.message })),
          Effect.flatMap((request) => suggestor.suggest(request))
        ),
    });
  })
);

export const AddressRpcServerLayer = layerHttpRouter({
  group: SuggestAddressRpcGroup,
  path: "/rpc",
}).pipe(Layer.provide(AddressRpcHandlers), Layer.provide(layerJson));
