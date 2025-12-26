import { Context, Layer } from "effect"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as Socket from "@effect/platform/Socket"
import type { RpcClientError } from "@effect/rpc/RpcClientError"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import { SuggestAddressRpcGroup } from "./suggest"

export class SuggestAddressClient extends Context.Tag("SuggestAddressClient")<
  SuggestAddressClient,
  RpcClient.RpcClient<RpcGroup.Rpcs<typeof SuggestAddressRpcGroup>, RpcClientError>
>() {}

export const SuggestAddressClientHttpLayer = (url: string) =>
  Layer.scoped(SuggestAddressClient, RpcClient.make(SuggestAddressRpcGroup)).pipe(
    Layer.provide(RpcClient.layerProtocolHttp({ url })),
    Layer.provide(RpcSerialization.layerJson)
  )

export const SuggestAddressClientWebSocketLayer = (url: string) =>
  Layer.scoped(SuggestAddressClient, RpcClient.make(SuggestAddressRpcGroup)).pipe(
    Layer.provide(RpcClient.layerProtocolSocket()),
    Layer.provide(Socket.layerWebSocket(url)),
    Layer.provide(Socket.layerWebSocketConstructorGlobal),
    Layer.provide(RpcSerialization.layerJson)
  )
