import { make } from "@effect/platform/HttpClient";
import { fromWeb } from "@effect/platform/HttpClientResponse";
import type { HttpClientRequest } from "@effect/platform/HttpClientRequest";
import { Effect, Ref } from "effect";

type JsonResponse = Record<string, unknown> | Array<unknown>;

export const makeJsonTestClient = <T extends JsonResponse>(payload: T) =>
  Effect.gen(function* () {
    const requestRef = yield* Ref.make<HttpClientRequest | null>(null);
    const client = make((request) =>
      Effect.gen(function* () {
        yield* Ref.set(requestRef, request);
        return fromWeb(
          request,
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        );
      })
    );

    return {
      client,
      getRequest: () => Ref.get(requestRef),
    };
  });
