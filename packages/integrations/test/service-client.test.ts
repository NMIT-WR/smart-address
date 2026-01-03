import { HttpClient } from "@effect/platform/HttpClient";
import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import { makeAddressServiceClient } from "../src/service-client";
import { makeJsonTestClient } from "./http-client";

describe("address service client", () => {
  it.effect("posts to the suggest endpoint and decodes the response", () =>
    Effect.gen(function* () {
      const program = Effect.gen(function* () {
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
        const { client, getRequest } = yield* makeJsonTestClient(
          responsePayload
        );

        const serviceClient = makeAddressServiceClient({
          baseUrl: "https://example.test",
        });
        const result = yield* serviceClient
          .suggest({ text: "Main St", strategy: "fast" })
          .pipe(Effect.provideService(HttpClient, client));

        return { result, request: yield* getRequest() };
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
        const { client, getRequest } = yield* makeJsonTestClient({ ok: true });

        const serviceClient = makeAddressServiceClient({
          baseUrl: "https://example.test",
        });
        yield* serviceClient
          .accept({
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
          })
          .pipe(Effect.provideService(HttpClient, client));

        return { request: yield* getRequest() };
      });

      const { request } = yield* program;

      expect(request).not.toBeNull();
      expect(request?.method).toBe("POST");
      expect(request?.url).toBe("https://example.test/accept");
    })
  );
});
