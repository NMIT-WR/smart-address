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

  it("returns empty results when there are no items", async () => {
    const result = await Effect.runPromise(parseHereDiscoverResponse({ items: [] }))

    expect(result).toHaveLength(0)
  })

  it("handles items with missing optional fields", async () => {
    const payload = {
      items: [
        {
          id: "here:cm:456",
          title: "Fallback Title"
        }
      ]
    }

    const result = await Effect.runPromise(parseHereDiscoverResponse(payload))

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("here-discover:here:cm:456")
    expect(result[0]?.label).toBe("Fallback Title")
    expect(result[0]?.address).toEqual({})
    expect(result[0]?.metadata).toBeUndefined()
  })

  it("falls back to title when the address label is missing", async () => {
    const payload = {
      items: [
        {
          id: "here:cm:789",
          title: "Center Plaza",
          address: {
            street: "Main St"
          }
        }
      ]
    }

    const result = await Effect.runPromise(parseHereDiscoverResponse(payload))

    expect(result).toHaveLength(1)
    expect(result[0]?.label).toBe("Center Plaza")
    expect(result[0]?.address.line1).toBe("Main St")
    expect(result[0]?.metadata).toBeUndefined()
  })

  it("omits lat/lng metadata when position is missing", async () => {
    const payload = {
      items: [
        {
          id: "here:cm:999",
          title: "No Position",
          categories: [{ id: "200-2000-0000", name: "Shop", primary: true }]
        }
      ]
    }

    const result = await Effect.runPromise(parseHereDiscoverResponse(payload))

    expect(result).toHaveLength(1)
    expect(result[0]?.metadata?.lat).toBeUndefined()
    expect(result[0]?.metadata?.lng).toBeUndefined()
    expect(result[0]?.metadata?.categoryName).toBe("Shop")
  })
})
