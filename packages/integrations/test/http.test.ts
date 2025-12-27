import { describe, expect, it } from "@effect-native/bun-test"
import { Effect, Ref } from "effect"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as UrlParams from "@effect/platform/UrlParams"
import { makeHttpAddressProvider } from "../src/http"

describe("http address provider", () => {
  it("builds request and parses response", async () => {
    const program = Effect.gen(function* () {
      const requestRef = yield* Ref.make<HttpClientRequest.HttpClientRequest | null>(null)
      const responsePayload = [
        {
          id: "demo:1",
          label: "Demo",
          address: { line1: "Demo" },
          source: { provider: "demo" }
        }
      ]

      const client = HttpClient.make((request) =>
        Effect.gen(function* () {
          yield* Ref.set(requestRef, request)
          const response = HttpClientResponse.fromWeb(
            request,
            new Response(JSON.stringify(responsePayload), {
              status: 200,
              headers: { "content-type": "application/json" }
            })
          )
          return response
        })
      )

      const provider = makeHttpAddressProvider({
        name: "demo",
        buildRequest: (query) =>
          HttpClientRequest.get("https://example.test/search", {
            urlParams: { q: query.text },
            acceptJson: true
          }),
        parseResponse: (response) =>
          response.json.pipe(
            Effect.map((body) =>
              Array.isArray(body)
                ? body.map((item) => ({
                    id: (item as { id: string }).id,
                    label: (item as { label: string }).label,
                    address: (item as { address: { line1?: string } }).address,
                    source: { provider: "demo" }
                  }))
                : []
            )
          )
      })

      const suggestions = yield* provider
        .suggest({ text: "Main St" })
        .pipe(Effect.provideService(HttpClient.HttpClient, client))
      const request = yield* Ref.get(requestRef)

      return { suggestions, request }
    })

    const { suggestions, request } = await Effect.runPromise(program)

    expect(suggestions[0]?.id).toBe("demo:1")
    expect(request).not.toBeNull()
    expect(request?.method).toBe("GET")
    expect(request?.url).toBe("https://example.test/search")
    if (request) {
      const params = UrlParams.toRecord(request.urlParams)
      expect(params.q).toBe("Main St")
    }
  })
})
