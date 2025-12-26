import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { AddressCachedSuggestor } from "../src/cache"
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

const runWithSuggestor = <A>(effect: Effect.Effect<A>) =>
  Effect.runPromise(effect.pipe(Effect.provideService(AddressCachedSuggestor, suggestor)))

describe("http handlers", () => {
  it("handles GET /suggest", async () => {
    const request = HttpServerRequest.fromWeb(
      new Request("http://localhost/suggest?text=Main&strategy=fast")
    )

    const response = await runWithSuggestor(handleSuggestGet(request))
    const web = HttpServerResponse.toWeb(response)
    const body = await web.json()

    expect(web.status).toBe(200)
    expect(body.suggestions[0]?.id).toBe("sample:1")
  })

  it("handles POST /suggest", async () => {
    const request = HttpServerRequest.fromWeb(
      new Request("http://localhost/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Main" })
      })
    )

    const response = await runWithSuggestor(handleSuggestPost(request))
    const web = HttpServerResponse.toWeb(response)
    const body = await web.json()

    expect(web.status).toBe(200)
    expect(body.suggestions[0]?.id).toBe("sample:1")
  })

  it("returns an error for missing text", async () => {
    const request = HttpServerRequest.fromWeb(
      new Request("http://localhost/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      })
    )

    const response = await runWithSuggestor(handleSuggestPost(request))
    const web = HttpServerResponse.toWeb(response)
    const body = await web.json()

    expect(web.status).toBe(400)
    expect(body.error).toBeTypeOf("string")
  })

})
