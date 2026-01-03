import { make } from "@effect/platform/HttpClient";
import type { HttpClientRequest } from "@effect/platform/HttpClientRequest";
import { fromWeb } from "@effect/platform/HttpClientResponse";
import { Effect, Ref } from "effect";

type JsonResponse = Record<string, unknown> | unknown[];

interface JsonClientOptions {
  readonly status?: number;
  readonly headers?: HeadersInit;
}

export const makeJsonTestClient = <T extends JsonResponse>(
  payload: T,
  options?: JsonClientOptions
) =>
  Effect.gen(function* () {
    const requestRef = yield* Ref.make<HttpClientRequest | null>(null);
    const client = make((request) =>
      Effect.gen(function* () {
        yield* Ref.set(requestRef, request);
        const headers = new Headers({ "content-type": "application/json" });
        if (options?.headers) {
          for (const [key, value] of new Headers(options.headers)) {
            headers.set(key, value);
          }
        }
        return fromWeb(
          request,
          new Response(JSON.stringify(payload), {
            status: options?.status ?? 200,
            headers,
          })
        );
      })
    );

    return {
      client,
      getRequest: () => Ref.get(requestRef),
    };
  });
