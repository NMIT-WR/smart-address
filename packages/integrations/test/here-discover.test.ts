import { describe, expect, it } from "@effect-native/bun-test"
import { Effect } from "effect"
import { parseHereDiscoverResponse } from "../src/here-discover"

describe("here discover mapping", () => {
  it("maps discover response into suggestions", async () => {
    const payload = {
      items: [
        {
          id: "here:cm:123",
          title: "Main St 1",
          resultType: "houseNumber",
          address: {
            label: "Main St 1, Prague 11000, Czechia",
            houseNumber: "1",
            street: "Main St",
            district: "Old Town",
            city: "Prague",
            state: "Prague",
            postalCode: "11000",
            countryCode: "CZE"
          },
          position: { lat: 50.087, lng: 14.421 },
          distance: 120,
          scoring: { queryScore: 0.81 },
          categories: [{ id: "100-1000-0000", name: "Restaurant", primary: true }]
        }
      ]
    }

    const result = await Effect.runPromise(parseHereDiscoverResponse(payload))

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("here-discover:here:cm:123")
    expect(result[0]?.label).toBe("Main St 1, Prague 11000, Czechia")
    expect(result[0]?.address.line1).toBe("1 Main St")
    expect(result[0]?.address.city).toBe("Prague")
    expect(result[0]?.address.countryCode).toBe("CZE")
    expect(result[0]?.metadata?.lat).toBe("50.087")
    expect(result[0]?.metadata?.categoryName).toBe("Restaurant")
  })
})
