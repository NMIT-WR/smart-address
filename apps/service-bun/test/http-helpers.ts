import {
  fromWeb,
  type HttpServerRequest,
} from "@effect/platform/HttpServerRequest";
import {
  type HttpServerResponse,
  toWeb,
} from "@effect/platform/HttpServerResponse";
import { Effect } from "effect";

const testOrigin = "http://localhost";

export const parseJsonResponse = (
  response: HttpServerResponse
): Effect.Effect<{ web: Response; body: unknown }> =>
  Effect.gen(function* () {
    const web = toWeb(response);
    const body = yield* Effect.promise(() => web.json());
    return { web, body };
  });

export const makeRequestUrl = (path: string) => new URL(path, testOrigin);

export const makeSuggestPostRequest = (body: unknown) =>
  fromWeb(
    new Request(makeRequestUrl("/suggest"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

const makeAcceptPostRequest = (body: unknown) =>
  fromWeb(
    new Request(makeRequestUrl("/accept"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

interface AcceptLog {
  readonly record: (payload: unknown) => Effect.Effect<void>;
}

type AcceptHandler = (
  request: HttpServerRequest
) => Effect.Effect<HttpServerResponse>;

export const makeRunAcceptRequest =
  (handlerFactory: (log: AcceptLog) => AcceptHandler) =>
  (payload: unknown, record: (payload: unknown) => Effect.Effect<void>) =>
    Effect.gen(function* () {
      const request = makeAcceptPostRequest(payload);
      const response = yield* handlerFactory({ record })(request);
      return yield* parseJsonResponse(response);
    });
