import { Effect, Layer } from "effect"
import * as Context from "effect/Context"
import * as Socket from "@effect/platform/Socket"
import * as SocketServer from "@effect/platform/SocketServer"

export type DataChannelLike = {
  readonly readyState: "connecting" | "open" | "closing" | "closed"
  binaryType?: string
  addEventListener: (type: string, listener: (event: any) => void, options?: any) => void
  removeEventListener: (type: string, listener: (event: any) => void, options?: any) => void
  send: (data: string | ArrayBuffer | ArrayBufferView) => void
  close: () => void
}

const makeReadableStream = (channel: DataChannelLike): ReadableStream<Uint8Array | string> =>
  new ReadableStream<Uint8Array | string>({
    start(controller) {
      const onMessage = (event: any) => {
        const data = event.data
        if (data instanceof ArrayBuffer) {
          controller.enqueue(new Uint8Array(data))
          return
        }
        controller.enqueue(typeof data === "string" ? data : new Uint8Array(data))
      }
      const onClose = () => controller.close()
      const onError = (event: any) => controller.error(event)

      channel.addEventListener("message", onMessage)
      channel.addEventListener("close", onClose)
      channel.addEventListener("error", onError)

      return () => {
        channel.removeEventListener("message", onMessage)
        channel.removeEventListener("close", onClose)
        channel.removeEventListener("error", onError)
      }
    }
  })

const makeWritableStream = (channel: DataChannelLike): WritableStream<Uint8Array> =>
  new WritableStream<Uint8Array>({
    write(chunk) {
      channel.send(chunk)
    },
    close() {
      channel.close()
    }
  })

const toInputStream = (channel: DataChannelLike): Socket.InputTransformStream => {
  if (typeof channel.binaryType === "string") {
    channel.binaryType = "arraybuffer"
  }
  return {
    readable: makeReadableStream(channel),
    writable: makeWritableStream(channel)
  }
}

export const makeDataChannelSocket = (channel: DataChannelLike) =>
  Socket.fromTransformStream(Effect.sync(() => toInputStream(channel)))

export const layerDataChannelSocket = (channel: DataChannelLike) =>
  Layer.effect(Socket.Socket, makeDataChannelSocket(channel))

type SocketServerService = Context.Tag.Service<typeof SocketServer.SocketServer>

export const makeDataChannelSocketServer = (channel: DataChannelLike) =>
  Effect.succeed<SocketServerService>({
    address: {
      _tag: "UnixAddress",
      path: "webrtc:data-channel"
    },
    run: (handler: (socket: Socket.Socket) => Effect.Effect<any, any, any>) =>
      makeDataChannelSocket(channel).pipe(
        Effect.flatMap(handler),
        Effect.catchAllCause((cause) =>
          Effect.fail(
            new SocketServer.SocketServerError({
              reason: "Unknown",
              cause
            })
          )
        ),
        Effect.zipRight(Effect.never)
      )
  })

export const layerDataChannelSocketServer = (channel: DataChannelLike) =>
  Layer.effect(SocketServer.SocketServer, makeDataChannelSocketServer(channel))
