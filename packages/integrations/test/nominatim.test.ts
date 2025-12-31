import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import { parseNominatimResponse } from "../src/nominatim";

describe("nominatim mapping", () => {
  it.effect("maps nominatim response into suggestions", () =>
    Effect.gen(function* () {
      const payload = [
        {
          place_id: 123,
          osm_type: "way",
          osm_id: 456,
          lat: "50.087",
          lon: "14.421",
          display_name: "Main St 1, Prague, CZ",
          importance: 0.77,
          class: "place",
          type: "house",
          address: {
            house_number: "1",
            road: "Main St",
            city: "Prague",
            state: "Prague",
            postcode: "11000",
            country_code: "cz",
          },
        },
      ];

      const result = yield* parseNominatimResponse(payload);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("nominatim:123");
      expect(result[0]?.address.line1).toBe("1 Main St");
      expect(result[0]?.address.city).toBe("Prague");
      expect(result[0]?.address.countryCode).toBe("CZ");
      expect(result[0]?.metadata?.lat).toBe("50.087");
      expect(result[0]?.metadata?.osmId).toBe("456");
    })
  );
});
