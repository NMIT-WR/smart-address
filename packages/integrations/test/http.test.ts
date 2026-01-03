import { HttpClient, make } from "@effect/platform/HttpClient";
import {
  get,
  type HttpClientRequest,
} from "@effect/platform/HttpClientRequest";
import { fromWeb } from "@effect/platform/HttpClientResponse";
import { toRecord } from "@effect/platform/UrlParams";
import { describe, expect, it } from "@effect-native/bun-test";
import { Effect, Ref } from "effect";
import { makeHttpAddressProvider } from "../src/http";

describe("http address provider", () => {
  it.effect("builds request and parses response", () =>
    Effect.gen(function* () {
      const program = Effect.gen(function* () {
        const requestRef = yield* Ref.make<HttpClientRequest | null>(null);
        const responsePayload = [
          {
            id: "demo:1",
            label: "Demo",
            address: { line1: "Demo" },
            source: { provider: "demo" },
          },
        ];

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

        const provider = makeHttpAddressProvider({
          name: "demo",
          buildRequest: (query) =>
            get("https://example.test/search", {
              urlParams: { q: query.text },
              acceptJson: true,
            }),
          parseResponse: (response) =>
            response.json.pipe(
              Effect.map((body) =>
                Array.isArray(body)
                  ? body.map((item) => ({
                      id: (item as { id: string }).id,
                      label: (item as { label: string }).label,
                      address: (item as { address: { line1?: string } })
                        .address,
                      source: { provider: "demo" },
                    }))
                  : []
              )
            ),
        });

        const suggestions = yield* provider
          .suggest({ text: "Main St" })
          .pipe(Effect.provideService(HttpClient, client));
        const request = yield* Ref.get(requestRef);

        return { suggestions, request };
      });

      const { suggestions, request } = yield* program;

      expect(suggestions[0]?.id).toBe("demo:1");
      expect(request).not.toBeNull();
      expect(request?.method).toBe("GET");
      expect(request?.url).toBe("https://example.test/search");
      if (request) {
        const params = toRecord(request.urlParams);
        expect(params.q).toBe("Main St");
      }
    })
  );
});
