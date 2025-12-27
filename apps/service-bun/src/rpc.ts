import { Effect, Layer } from "effect"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import { SuggestAddressRpcGroup } from "@smart-address/rpc/suggest"
import { AddressCachedSuggestor } from "./cache"
import { toSuggestRequest } from "./request"

const AddressRpcHandlers = SuggestAddressRpcGroup.toLayer(
  Effect.gen(function* () {
    const suggestor = yield* AddressCachedSuggestor
    return SuggestAddressRpcGroup.of({
      "suggest-address": (payload) =>
        toSuggestRequest(payload).pipe(
          Effect.mapError((error) => ({ message: error.message })),
          Effect.flatMap((request) => suggestor.suggest(request))
        )
    })
  })
)

export const AddressRpcServerLayer = Layer.mergeAll(
  AddressRpcHandlers,
  RpcServer.layerHttpRouter({ group: SuggestAddressRpcGroup, path: "/rpc" }).pipe(
    Layer.provide(RpcSerialization.layerJson)
  )
)
