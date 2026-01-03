import {
  fromTransformStream,
  type InputTransformStream,
  Socket,
} from "@effect/platform/Socket";
import { SocketServer, SocketServerError } from "@effect/platform/SocketServer";
import { Effect, Layer } from "effect";
import type { Context } from "effect/Context";

export interface DataChannelMessageEvent {
  readonly data: string | ArrayBuffer | ArrayBufferView;
}

export interface DataChannelCloseEvent {
  readonly type?: "close";
}

export interface DataChannelErrorEvent {
  readonly error?: unknown;
}

export interface DataChannelEventMap {
  readonly message: DataChannelMessageEvent;
  readonly close: DataChannelCloseEvent;
  readonly error: DataChannelErrorEvent;
}

export type DataChannelEventType = keyof DataChannelEventMap;

export type DataChannelListener<K extends DataChannelEventType> = (
  event: DataChannelEventMap[K]
) => void;

export type DataChannelListenerOptions =
  | boolean
  | {
      readonly capture?: boolean;
      readonly once?: boolean;
      readonly passive?: boolean;
    };

export interface DataChannelLike {
  readonly readyState: "connecting" | "open" | "closing" | "closed";
  binaryType?: string;
  addEventListener: <K extends DataChannelEventType>(
    type: K,
    listener: DataChannelListener<K>,
    options?: DataChannelListenerOptions
  ) => void;
  removeEventListener: <K extends DataChannelEventType>(
    type: K,
    listener: DataChannelListener<K>,
    options?: DataChannelListenerOptions
  ) => void;
  send: (data: string | ArrayBuffer | ArrayBufferView) => void;
  close: () => void;
}

const makeReadableStream = (
  channel: DataChannelLike
): ReadableStream<Uint8Array | string> => {
  let cleanup: (() => void) | null = null;
  return new ReadableStream<Uint8Array | string>({
    start(controller) {
      const onMessage: DataChannelListener<"message"> = (event) => {
        const data = event.data;
        if (data instanceof ArrayBuffer) {
          controller.enqueue(new Uint8Array(data));
          return;
        }
        controller.enqueue(
          typeof data === "string" ? data : new Uint8Array(data)
        );
      };
      const onClose: DataChannelListener<"close"> = () => {
        cleanup?.();
        controller.close();
      };
      const onError: DataChannelListener<"error"> = (event) => {
        cleanup?.();
        controller.error(event.error ?? event);
      };

      cleanup = () => {
        channel.removeEventListener("message", onMessage);
        channel.removeEventListener("close", onClose);
        channel.removeEventListener("error", onError);
        cleanup = null;
      };

      channel.addEventListener("message", onMessage);
      channel.addEventListener("close", onClose);
      channel.addEventListener("error", onError);
    },
    cancel() {
      cleanup?.();
    },
  });
};

const makeWritableStream = (
  channel: DataChannelLike
): WritableStream<Uint8Array> =>
  new WritableStream<Uint8Array>({
    write(chunk) {
      channel.send(chunk);
    },
    close() {
      channel.close();
    },
  });

const toInputStream = (channel: DataChannelLike): InputTransformStream => {
  if (typeof channel.binaryType === "string") {
    channel.binaryType = "arraybuffer";
  }
  return {
    readable: makeReadableStream(channel),
    writable: makeWritableStream(channel),
  };
};

export const makeDataChannelSocket = (channel: DataChannelLike) =>
  fromTransformStream(Effect.sync(() => toInputStream(channel)));

export const layerDataChannelSocket = (channel: DataChannelLike) =>
  Layer.effect(Socket, makeDataChannelSocket(channel));

type SocketServerService = Context.Tag.Service<typeof SocketServer>;

export const makeDataChannelSocketServer = (channel: DataChannelLike) =>
  Effect.succeed<SocketServerService>({
    address: {
      _tag: "UnixAddress",
      path: "webrtc:data-channel",
    },
    run: <A, E, R>(handler: (socket: Socket) => Effect.Effect<A, E, R>) =>
      makeDataChannelSocket(channel).pipe(
        Effect.flatMap(handler),
        Effect.catchAllCause((cause) =>
          Effect.fail(
            new SocketServerError({
              reason: "Unknown",
              cause,
            })
          )
        ),
        Effect.zipRight(Effect.never)
      ),
  });

export const layerDataChannelSocketServer = (channel: DataChannelLike) =>
  Layer.effect(SocketServer, makeDataChannelSocketServer(channel));
