import { describe, expect, it } from "@effect-native/bun-test"
import { Effect } from "effect"
import { parseHereResponse } from "../src/here"

describe("here mapping", () => {
  it("maps here response into suggestions", async () => {
    const payload = {
      items: [
        {
          title: "Alexanderplatz, Berlin, Germany",
          id: "here:pds:place:276u33db-abc123",
          resultType: "locality",
          localityType: "district",
          address: {
            label: "Alexanderplatz, 10178 Berlin, Germany",
            countryCode: "DEU",
            countryName: "Germany",
            stateCode: "BE",
            state: "Berlin",
            city: "Berlin",
            district: "Mitte",
            postalCode: "10178",
            street: "Alexanderplatz",
            houseNumber: "1"
          },
          position: {
            lat: 52.52191,
            lng: 13.41346
          },
          scoring: {
            queryScore: 0.95
          }
        }
      ]
    }

    const result = await Effect.runPromise(parseHereResponse(payload))

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("here:here:pds:place:276u33db-abc123")
    expect(result[0]?.label).toBe("Alexanderplatz, Berlin, Germany")
    expect(result[0]?.address.line1).toBe("Alexanderplatz 1")
    expect(result[0]?.address.line2).toBe("Mitte")
    expect(result[0]?.address.city).toBe("Berlin")
    expect(result[0]?.address.region).toBe("Berlin")
    expect(result[0]?.address.postalCode).toBe("10178")
    expect(result[0]?.address.countryCode).toBe("DEU")
    expect(result[0]?.score).toBe(0.95)
    expect(result[0]?.metadata?.lat).toBe("52.52191")
    expect(result[0]?.metadata?.lng).toBe("13.41346")
    expect(result[0]?.metadata?.resultType).toBe("locality")
    expect(result[0]?.metadata?.localityType).toBe("district")
    expect(result[0]?.source.provider).toBe("here")
    expect(result[0]?.source.kind).toBe("internal")
  })

  it("handles minimal response", async () => {
    const payload = {
      items: [
        {
          title: "Berlin",
          id: "here:cm:namedplace:12345"
        }
      ]
    }

    const result = await Effect.runPromise(parseHereResponse(payload))

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("here:here:cm:namedplace:12345")
    expect(result[0]?.label).toBe("Berlin")
    expect(result[0]?.address).toEqual({})
  })

  it("handles empty response", async () => {
    const payload = {
      items: []
    }

    const result = await Effect.runPromise(parseHereResponse(payload))

    expect(result).toHaveLength(0)
  })

  it("handles response without position", async () => {
    const payload = {
      items: [
        {
          title: "Some Place",
          id: "here:test:123",
          address: {
            city: "Prague",
            countryCode: "CZE"
          }
        }
      ]
    }

    const result = await Effect.runPromise(parseHereResponse(payload))

    expect(result).toHaveLength(1)
    expect(result[0]?.address.city).toBe("Prague")
    expect(result[0]?.address.countryCode).toBe("CZE")
    expect(result[0]?.metadata?.lat).toBeUndefined()
    expect(result[0]?.metadata?.lng).toBeUndefined()
  })
})
