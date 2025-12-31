import {
  layerProtocolSocket,
  make as makeRpcClient,
} from "@effect/rpc/RpcClient";
import { layerJson } from "@effect/rpc/RpcSerialization";
import { layer, layerProtocolSocketServer } from "@effect/rpc/RpcServer";
import { describe, expect, it } from "@effect-native/bun-test";
import { Deferred, Effect, Fiber, Layer, Ref } from "effect";
import { SuggestAddressRpcGroup } from "../src/suggest";
import {
  type DataChannelEventMap,
  type DataChannelEventType,
  type DataChannelLike,
  type DataChannelListener,
  layerDataChannelSocket,
  layerDataChannelSocketServer,
  makeDataChannelSocket,
  makeDataChannelSocketServer,
} from "../src/webrtc";

class TestDataChannel implements DataChannelLike {
  readonly readyState = "open";
  binaryType?: string = "arraybuffer";
  readonly sent: Array<string | ArrayBuffer | ArrayBufferView> = [];
  readonly listeners = new Map<
    DataChannelEventType,
    Set<DataChannelListener<DataChannelEventType>>
  >();

  addEventListener<K extends DataChannelEventType>(
    type: K,
    listener: DataChannelListener<K>
  ) {
    const existing =
      this.listeners.get(type) ??
      new Set<DataChannelListener<DataChannelEventType>>();
    existing.add(listener as DataChannelListener<DataChannelEventType>);
    this.listeners.set(type, existing);
  }

  removeEventListener<K extends DataChannelEventType>(
    type: K,
    listener: DataChannelListener<K>
  ) {
    const existing = this.listeners.get(type);
    if (existing) {
      existing.delete(listener as DataChannelListener<DataChannelEventType>);
      if (existing.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  send(data: string | ArrayBuffer | ArrayBufferView) {
    this.sent.push(data);
  }

  close() {
    this.emit("close", {});
  }

  emitMessage(data: string | ArrayBuffer | ArrayBufferView) {
    this.emit("message", { data });
  }

  emit<K extends DataChannelEventType>(type: K, event: DataChannelEventMap[K]) {
    const existing = this.listeners.get(type);
    if (!existing) {
      return;
    }
    for (const listener of existing) {
      listener(event);
    }
  }
}

class PairedDataChannel implements DataChannelLike {
  readonly readyState = "open";
  binaryType?: string = "arraybuffer";
  peer?: PairedDataChannel;
  readonly listeners = new Map<
    DataChannelEventType,
    Set<DataChannelListener<DataChannelEventType>>
  >();

  addEventListener<K extends DataChannelEventType>(
    type: K,
    listener: DataChannelListener<K>
  ) {
    const existing =
      this.listeners.get(type) ??
      new Set<DataChannelListener<DataChannelEventType>>();
    existing.add(listener as DataChannelListener<DataChannelEventType>);
    this.listeners.set(type, existing);
  }

  removeEventListener<K extends DataChannelEventType>(
    type: K,
    listener: DataChannelListener<K>
  ) {
    const existing = this.listeners.get(type);
    if (existing) {
      existing.delete(listener as DataChannelListener<DataChannelEventType>);
      if (existing.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  send(data: string | ArrayBuffer | ArrayBufferView) {
    this.peer?.emit("message", { data });
  }

  close() {
    this.emit("close", {});
    this.peer?.emit("close", {});
  }

  emit<K extends DataChannelEventType>(type: K, event: DataChannelEventMap[K]) {
    const existing = this.listeners.get(type);
    if (!existing) {
      return;
    }
    for (const listener of existing) {
      listener(event);
    }
  }
}

const makePairedChannels = () => {
  const client = new PairedDataChannel();
  const server = new PairedDataChannel();
  client.peer = server;
  server.peer = client;
  return { client, server };
};

describe("webrtc socket adapter", () => {
  it.effect("writes data to the data channel", () =>
    Effect.gen(function* () {
      const channel = new TestDataChannel();
      const program = Effect.scoped(
        makeDataChannelSocket(channel).pipe(
          Effect.flatMap((socket) =>
            Effect.gen(function* () {
              const opened = yield* Deferred.make<void>();
              const write = yield* socket.writer;
              const fiber = yield* Effect.fork(
                socket.runRaw(() => undefined, {
                  onOpen: Deferred.succeed(opened, undefined),
                })
              );

              yield* Deferred.await(opened);
              yield* write(new Uint8Array([1, 2, 3]));
              channel.close();
              yield* Fiber.join(fiber);

              return channel.sent.length;
            })
          )
        )
      );

      const sentCount = yield* program;
      expect(sentCount).toBe(1);
    })
  );

  it.effect("delivers incoming messages to the handler", () =>
    Effect.gen(function* () {
      const channel = new TestDataChannel();
      const program = Effect.scoped(
        Effect.gen(function* () {
          const socket = yield* makeDataChannelSocket(channel);
          const received = yield* Ref.make<Array<string | Uint8Array>>([]);
          const fiber = yield* Effect.fork(
            socket.runRaw((data) =>
              Ref.update(received, (current) => [...current, data])
            )
          );

          yield* Effect.yieldNow();
          channel.emitMessage("hello");
          channel.close();

          yield* Fiber.join(fiber);
          return yield* Ref.get(received);
        })
      );

      const received = yield* program;
      expect(received).toEqual(["hello"]);
    })
  );

  it.effect("wraps a data channel as a socket server", () =>
    Effect.gen(function* () {
      const channel = new TestDataChannel();
      const program = Effect.scoped(
        Effect.gen(function* () {
          const server = yield* makeDataChannelSocketServer(channel);
          const written = yield* Deferred.make<void>();

          const fiber = yield* Effect.fork(
            server.run((socket) =>
              Effect.gen(function* () {
                const opened = yield* Deferred.make<void>();
                const runner = yield* Effect.fork(
                  socket.runRaw(() => undefined, {
                    onOpen: Deferred.succeed(opened, undefined),
                  })
                );
                const write = yield* socket.writer;
                yield* Deferred.await(opened);
                yield* write(new Uint8Array([7, 8, 9]));
                yield* Deferred.succeed(written, undefined);
                channel.close();
                yield* Fiber.join(runner);
              })
            )
          );

          yield* Deferred.await(written);
          yield* Fiber.interrupt(fiber);

          return channel.sent.length;
        })
      );

      const sentCount = yield* program;
      expect(sentCount).toBe(1);
    })
  );

  it.effect("supports RPC over a paired data channel", () =>
    Effect.gen(function* () {
      const { client, server } = makePairedChannels();
      const handlers = SuggestAddressRpcGroup.of({
        "suggest-address": () =>
          Effect.succeed({
            suggestions: [
              {
                id: "webrtc:1",
                label: "WebRTC",
                address: { line1: "WebRTC" },
                source: { provider: "webrtc" },
              },
            ],
            errors: [],
          }),
      });

      const serverProtocolLayer = layerProtocolSocketServer.pipe(
        Layer.provide(layerDataChannelSocketServer(server)),
        Layer.provide(layerJson)
      );

      const serverLayer = layer(SuggestAddressRpcGroup).pipe(
        Layer.provide(SuggestAddressRpcGroup.toLayer(handlers)),
        Layer.provide(serverProtocolLayer),
        Layer.provide(layerJson)
      );

      const clientProtocolLayer = layerProtocolSocket().pipe(
        Layer.provide(layerDataChannelSocket(client)),
        Layer.provide(layerJson)
      );

      const clientLayer = Layer.mergeAll(clientProtocolLayer, layerJson);

      const program = Effect.scoped(
        makeRpcClient(SuggestAddressRpcGroup).pipe(
          Effect.flatMap((rpcClient) =>
            rpcClient["suggest-address"]({ text: "WebRTC" })
          ),
          Effect.provide(Layer.mergeAll(serverLayer, clientLayer))
        )
      );

      const result = yield* program;
      expect(result.suggestions[0]?.id).toBe("webrtc:1");
    })
  );
});
