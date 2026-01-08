import { Cause, Effect, Exit } from "effect";
import {
  makeRequestEvent,
  RequestEvent,
  type RequestEventKind,
} from "./request-event";

type RequestEventSource = "http" | "rpc" | "mcp";

interface RequestEventRunInit {
  readonly requestId: string;
  readonly kind: RequestEventKind;
  readonly source: RequestEventSource;
  readonly method: string;
  readonly path: string;
  readonly spanName: string;
  readonly spanAttributes: Record<string, unknown>;
}

export const makeSuggestEventInit = (options: {
  readonly requestId: string;
  readonly kind: RequestEventKind;
  readonly source: RequestEventSource;
  readonly method: string;
  readonly path: string;
  readonly spanName: string;
  readonly rpcMethod?: string;
}): RequestEventRunInit => ({
  requestId: options.requestId,
  kind: options.kind,
  source: options.source,
  method: options.method,
  path: options.path,
  spanName: options.spanName,
  spanAttributes: {
    "rpc.method": options.rpcMethod ?? "suggest-address",
    "request.kind": options.kind,
    "request.source": options.source,
  },
});

export const runRequestEvent = <A, E, R>(
  init: RequestEventRunInit,
  effect: Effect.Effect<A, E, R>
) =>
  Effect.gen(function* () {
    const requestEvent = yield* makeRequestEvent({
      requestId: init.requestId,
      kind: init.kind,
      source: init.source,
      method: init.method,
      path: init.path,
    });

    yield* Effect.annotateCurrentSpan({ "request.id": init.requestId });

    const exit = yield* effect.pipe(
      Effect.provideService(RequestEvent, requestEvent),
      Effect.annotateSpans({
        "request.id": init.requestId,
        "request.kind": init.kind,
        "request.source": init.source,
      }),
      Effect.exit
    );

    const statusCode = Exit.isSuccess(exit) ? 200 : 500;
    if (Exit.isFailure(exit)) {
      const errorMessage = Cause.pretty(exit.cause);
      yield* requestEvent
        .recordError(errorMessage)
        .pipe(Effect.catchAll(() => Effect.void));
      yield* requestEvent.flush(statusCode);
      return yield* Effect.failCause(exit.cause);
    }

    yield* requestEvent.flush(statusCode);
    return exit.value;
  }).pipe(
    Effect.withSpan(init.spanName, {
      kind: "server",
      attributes: init.spanAttributes,
    })
  );
