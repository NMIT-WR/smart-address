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

const run = <A>(effect: Effect.Effect<A>) => Effect.runPromise(effect)

describe("http handlers", () => {
  it("handles GET /suggest", async () => {
    const request = HttpServerRequest.fromWeb(
      new Request("http://localhost/suggest?text=Main&strategy=fast")
    )

    const response = await run(handleSuggestGet(suggestor)(request))
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

    const response = await run(handleSuggestPost(suggestor)(request))
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

    const response = await run(handleSuggestPost(suggestor)(request))
    const web = HttpServerResponse.toWeb(response)
    const body = await web.json()

    expect(web.status).toBe(400)
    expect(body.error).toBeTypeOf("string")
  })

  it("rejects missing suggest key when configured", async () => {
    const request = HttpServerRequest.fromWeb(
      new Request("http://localhost/suggest?text=Main")
    )

    const response = await run(handleSuggestGet(suggestor, { keys: ["secret"] })(request))
    const web = HttpServerResponse.toWeb(response)
    const body = await web.json()

    expect(web.status).toBe(401)
    expect(body.error).toBe("Missing or invalid key.")
  })

  it("accepts suggest key when configured", async () => {
    const request = HttpServerRequest.fromWeb(
      new Request("http://localhost/suggest?key=secret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Main" })
      })
    )

    const response = await run(handleSuggestPost(suggestor, { keys: ["secret"] })(request))
    const web = HttpServerResponse.toWeb(response)
    const body = await web.json()

    expect(web.status).toBe(200)
    expect(body.suggestions[0]?.id).toBe("sample:1")
  })

})
