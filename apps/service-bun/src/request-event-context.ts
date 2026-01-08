import { Effect, Option } from "effect";
import type { AcceptRequest } from "./accept-request";
import type { SuggestRequest } from "./request";
import { RequestEvent } from "./request-event";

const withOptionalRequestEvent = <A>(
  f: (event: RequestEvent) => Effect.Effect<A>
) =>
  Effect.serviceOption(RequestEvent).pipe(
    Effect.flatMap((maybeEvent) =>
      Option.match(maybeEvent, {
        onNone: () => Effect.void,
        onSome: (event) => f(event),
      })
    ),
    Effect.catchAll(() => Effect.void)
  );

export const recordSuggestFromContext = (request: SuggestRequest) =>
  withOptionalRequestEvent((event) => event.recordSuggest(request));

export const recordAcceptFromContext = (request: AcceptRequest) =>
  withOptionalRequestEvent((event) =>
    event.recordAccept(request).pipe(Effect.zipRight(event.markImportant()))
  );
