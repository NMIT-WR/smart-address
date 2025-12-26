import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import {
  decodeSuggestPayload,
  payloadFromSearchParams,
  toSuggestRequest
} from "../src/request"

describe("request parsing", () => {
  it("parses search params into a suggest request", async () => {
    const params = {
      text: ["Main St"],
      limit: "5",
      countryCode: "cz",
      strategy: "fast"
    }

    const payload = payloadFromSearchParams(params)
    const decoded = await Effect.runPromise(decodeSuggestPayload(payload))
    const request = await Effect.runPromise(toSuggestRequest(decoded))

    expect(request.query.text).toBe("Main St")
    expect(request.query.limit).toBe(5)
    expect(request.query.countryCode).toBe("CZ")
    expect(request.strategy).toBe("fast")
  })

  it("fails when text is missing", async () => {
    const payload = {}
    const decoded = await Effect.runPromise(decodeSuggestPayload(payload))

    const error = await Effect.runPromise(toSuggestRequest(decoded).pipe(Effect.flip))
    expect(error).toMatchObject({ _tag: "SuggestRequestError" })
  })
})
