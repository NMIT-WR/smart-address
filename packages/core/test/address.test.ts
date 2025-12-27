import { describe, expect, it } from "@effect-native/bun-test"
import { Effect } from "effect"
import {
  makeAddressProvider,
  makeAddressSuggestionService,
  normalizeAddressQuery,
  type AddressProviderPlan
} from "../src/address"

describe("address core", () => {
  it("normalizes address queries", () => {
    const normalized = normalizeAddressQuery({
      text: "  Main St ",
      limit: 4.7,
      countryCode: " cz "
    })

    expect(normalized).toEqual({
      text: "Main St",
      limit: 4,
      countryCode: "CZ",
      locale: undefined,
      sessionToken: undefined
    })
  })

  it("dedupes providers and respects limit", async () => {
    const providerA = makeAddressProvider("a", () =>
      Effect.succeed([
        {
          id: "one",
          label: "One",
          address: {},
          source: { provider: "a" }
        },
        {
          id: "two",
          label: "Two",
          address: {},
          source: { provider: "a" }
        }
      ])
    )
    const providerB = makeAddressProvider("b", () =>
      Effect.succeed([
        {
          id: "two",
          label: "Two",
          address: {},
          source: { provider: "b" }
        },
        {
          id: "three",
          label: "Three",
          address: {},
          source: { provider: "b" }
        }
      ])
    )

    const plan: AddressProviderPlan = {
      stages: [
        { providers: [providerA] },
        { providers: [providerB] }
      ]
    }

    const service = makeAddressSuggestionService(plan)
    const result = await Effect.runPromise(service.suggest({ text: "Main", limit: 2 }))

    expect(result.suggestions.map((item) => item.id)).toEqual(["one", "two"])
    expect(result.errors).toEqual([])
  })

  it("collects provider errors without failing", async () => {
    const provider = makeAddressProvider("boom", () => Effect.fail(new Error("nope")))
    const service = makeAddressSuggestionService([provider])
    const result = await Effect.runPromise(service.suggest({ text: "Main" }))

    expect(result.suggestions).toEqual([])
    expect(result.errors).toEqual([{ provider: "boom", message: "nope" }])
  })
})
