import { layerJson } from "@effect/rpc/RpcSerialization";
import { layerHttpRouter } from "@effect/rpc/RpcServer";
import { SuggestAddressRpcGroup } from "@smart-address/rpc/suggest";
import { Effect, Layer } from "effect";
import { AddressCachedSuggestor } from "./cache";
import { toSuggestRequest } from "./request";
import { makeRequestId } from "./request-event";
import { recordSuggestFromContext } from "./request-event-context";
import { makeSuggestEventInit, runRequestEvent } from "./request-event-runner";

const AddressRpcHandlers = SuggestAddressRpcGroup.toLayer(
  Effect.gen(function* () {
    const suggestor = yield* AddressCachedSuggestor;
    return SuggestAddressRpcGroup.of({
      "suggest-address": (payload) =>
        Effect.gen(function* () {
          const requestId = makeRequestId();

          const effect = toSuggestRequest(payload).pipe(
            Effect.tap((request) => recordSuggestFromContext(request)),
            Effect.mapError((error) => ({ message: error.message })),
            Effect.flatMap((request) => suggestor.suggest(request))
          );

          return yield* runRequestEvent(
            makeSuggestEventInit({
              requestId,
              kind: "rpc.suggest",
              source: "rpc",
              method: "RPC",
              path: "/rpc/suggest-address",
              spanName: "rpc suggest-address",
            }),
            effect
          );
        }),
    });
  })
);

export const AddressRpcServerLayer = layerHttpRouter({
  group: SuggestAddressRpcGroup,
  path: "/rpc",
}).pipe(Layer.provide(AddressRpcHandlers), Layer.provide(layerJson));
