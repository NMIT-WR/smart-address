import {
  layerWebSocket,
  layerWebSocketConstructorGlobal,
} from "@effect/platform/Socket";
import {
  layerProtocolHttp,
  layerProtocolSocket,
  make as makeRpcClient,
  type RpcClient,
} from "@effect/rpc/RpcClient";
import type { RpcClientError } from "@effect/rpc/RpcClientError";
import type { Rpcs } from "@effect/rpc/RpcGroup";
import { layerJson } from "@effect/rpc/RpcSerialization";
import { Context, Layer } from "effect";
import { SuggestAddressRpcGroup } from "./suggest";

export class SuggestAddressClient extends Context.Tag("SuggestAddressClient")<
  SuggestAddressClient,
  RpcClient<Rpcs<typeof SuggestAddressRpcGroup>, RpcClientError>
>() {}

export const SuggestAddressClientHttpLayer = (url: string) =>
  Layer.scoped(
    SuggestAddressClient,
    makeRpcClient(SuggestAddressRpcGroup)
  ).pipe(Layer.provide(layerProtocolHttp({ url })), Layer.provide(layerJson));

export const SuggestAddressClientWebSocketLayer = (url: string) =>
  Layer.scoped(
    SuggestAddressClient,
    makeRpcClient(SuggestAddressRpcGroup)
  ).pipe(
    Layer.provide(layerProtocolSocket()),
    Layer.provide(layerWebSocket(url)),
    Layer.provide(layerWebSocketConstructorGlobal),
    Layer.provide(layerJson)
  );
