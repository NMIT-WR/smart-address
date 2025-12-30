import { describe, expect, it } from "@effect-native/bun-test"
import { Effect } from "effect"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { handleSuggestGet, handleSuggestPost } from "../src/http"

const sampleResult = {
  suggestions: [
    {
      id: "sample:1",
      label: "Sample",
      address: { line1: "Sample" },
      source: { provider: "sample" }
    }
  ],
  errors: []
}

const suggestor = {
  suggest: () => Effect.succeed(sampleResult)
}

describe("http handlers", () => {
  it.effect("handles GET /suggest", () =>
    Effect.gen(function* () {
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost/suggest?text=Main&strategy=fast")
      )

      const response = yield* handleSuggestGet(suggestor)(request)
      const web = HttpServerResponse.toWeb(response)
      const body = yield* Effect.promise(() => web.json())

      expect(web.status).toBe(200)
      expect(body.suggestions[0]?.id).toBe("sample:1")
    })
  )

  it.effect("handles POST /suggest", () =>
    Effect.gen(function* () {
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "Main" })
        })
      )

      const response = yield* handleSuggestPost(suggestor)(request)
      const web = HttpServerResponse.toWeb(response)
      const body = yield* Effect.promise(() => web.json())

      expect(web.status).toBe(200)
      expect(body.suggestions[0]?.id).toBe("sample:1")
    })
  )

  it.effect("returns an error for missing text", () =>
    Effect.gen(function* () {
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({})
        })
      )

      const response = yield* handleSuggestPost(suggestor)(request)
      const web = HttpServerResponse.toWeb(response)
      const body = yield* Effect.promise(() => web.json())

      expect(web.status).toBe(400)
      expect(body.error).toBeTypeOf("string")
    })
  )
})
