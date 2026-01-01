import { HttpClient, make } from "@effect/platform/HttpClient";
import type { HttpClientRequest } from "@effect/platform/HttpClientRequest";
import { fromWeb } from "@effect/platform/HttpClientResponse";
import { describe, expect, it } from "@effect-native/bun-test";
import { Effect, Ref } from "effect";
import { makeAddressServiceClient } from "../src/service-client";

describe("address service client", () => {
  it.effect("posts to the suggest endpoint and decodes the response", () =>
    Effect.gen(function* () {
      const program = Effect.gen(function* () {
        const requestRef = yield* Ref.make<HttpClientRequest | null>(null);
        const responsePayload = {
          suggestions: [
            {
              id: "svc:1",
              label: "Service",
              address: { line1: "Service" },
              source: { provider: "service" },
            },
          ],
          errors: [],
        };

        const client = make((request) =>
          Effect.gen(function* () {
            yield* Ref.set(requestRef, request);
            const response = fromWeb(
              request,
              new Response(JSON.stringify(responsePayload), {
                status: 200,
                headers: { "content-type": "application/json" },
              })
            );
            return response;
          })
        );

        const serviceClient = makeAddressServiceClient({
          baseUrl: "https://example.test",
        });
        const result = yield* serviceClient
          .suggest({ text: "Main St", strategy: "fast" })
          .pipe(Effect.provideService(HttpClient, client));

        return { result, request: yield* Ref.get(requestRef) };
      });

      const { result, request } = yield* program;

      expect(result.suggestions[0]?.id).toBe("svc:1");
      expect(request).not.toBeNull();
      expect(request?.method).toBe("POST");
      expect(request?.url).toBe("https://example.test/suggest");
    })
  );

  it.effect("posts to the accept endpoint", () =>
    Effect.gen(function* () {
      const program = Effect.gen(function* () {
        const requestRef = yield* Ref.make<HttpClientRequest | null>(null);
        const client = make((request) =>
          Effect.gen(function* () {
            yield* Ref.set(requestRef, request);
            const response = fromWeb(
              request,
              new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "content-type": "application/json" },
              })
            );
            return response;
          })
        );

        const serviceClient = makeAddressServiceClient({
          baseUrl: "https://example.test",
        });
        yield* serviceClient.accept({
          text: "Main St",
          strategy: "reliable",
          suggestion: {
            id: "svc:1",
            label: "Service",
            address: { line1: "Service" },
            source: { provider: "service" },
          },
          resultIndex: 0,
          resultCount: 1,
        }).pipe(Effect.provideService(HttpClient, client));

        return { request: yield* Ref.get(requestRef) };
      });

      const { request } = yield* program;

      expect(request).not.toBeNull();
      expect(request?.method).toBe("POST");
      expect(request?.url).toBe("https://example.test/accept");
    })
  );
});
