import { describe, expect, it } from "bun:test"
import { createClient, type AddressStrategy } from "../src/client"

const makeFetch = (calls: string[]) =>
  async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response(
      JSON.stringify({ suggestions: [], errors: [] }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    )
  }

describe("smart-address sdk", () => {
  it("uses provided fetch and builds query params", async () => {
    const calls: string[] = []
    const client = createClient({
      baseUrl: "https://example.test",
      key: "docs-demo",
      fetch: makeFetch(calls)
    })

    await client.suggest({
      text: "Prague",
      limit: 5,
      countryCode: "cz",
      sessionToken: "session-1",
      strategy: "reliable"
    })

    expect(calls.length).toBe(1)
    expect(calls[0]).toBe(
      "https://example.test/suggest?text=Prague&limit=5&countryCode=CZ&sessionToken=session-1&strategy=reliable&key=docs-demo"
    )
  })

  it("omits limit when zero or negative", async () => {
    const calls: string[] = []
    const client = createClient({
      baseUrl: "https://example.test/suggest",
      fetch: makeFetch(calls)
    })

    await client.suggest({ text: "Praha", limit: 0 })

    expect(calls.length).toBe(1)
    const url = new URL(calls[0])
    expect(url.pathname).toBe("/suggest")
    expect(url.searchParams.has("limit")).toBe(false)
  })

  it("rejects unsupported strategies", async () => {
    const calls: string[] = []
    const client = createClient({
      baseUrl: "https://example.test",
      fetch: makeFetch(calls)
    })

    await expect(
      client.suggest({ text: "Prague", strategy: "fastest" as AddressStrategy })
    ).rejects.toThrow("Invalid strategy. Expected 'fast' or 'reliable'.")
    expect(calls.length).toBe(0)
  })
})
