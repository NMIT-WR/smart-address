import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import { parseRadarAutocompleteResponse } from "../src/radar-autocomplete";

describe("radar autocomplete mapping", () => {
  it.effect("maps radar response into suggestions", () =>
    Effect.gen(function* () {
      const payload = {
        addresses: [
          {
            latitude: 40.695_779,
            longitude: -73.991_489,
            country: "United States",
            countryCode: "US",
            county: "Kings County",
            distance: 990,
            borough: "Brooklyn",
            city: "Brooklyn",
            number: "1",
            neighborhood: "Brooklyn Heights",
            postalCode: "11201",
            stateCode: "NY",
            state: "New York",
            street: "Clinton St",
            layer: "place",
            formattedAddress: "1 Clinton St, Brooklyn, New York, NY 11201 USA",
            placeLabel: "Brooklyn Roasting Company",
          },
        ],
      };

      const result = yield* parseRadarAutocompleteResponse(payload);

      expect(result).toEqual([
        expect.objectContaining({
          id: "radar-autocomplete:1 Clinton St, Brooklyn, New York, NY 11201 USA|40.695779,-73.991489|place",
          label: "1 Clinton St, Brooklyn, New York, NY 11201 USA",
          address: expect.objectContaining({
            line1: "1 Clinton St",
            city: "Brooklyn",
            region: "New York",
            postalCode: "11201",
            countryCode: "US",
          }),
          metadata: expect.objectContaining({
            lat: "40.695779",
            lng: "-73.991489",
            distance: "990",
            layer: "place",
            placeLabel: "Brooklyn Roasting Company",
          }),
        }),
      ]);
    })
  );

  it.effect("returns empty results when there are no addresses", () =>
    Effect.gen(function* () {
      const result = yield* parseRadarAutocompleteResponse({ addresses: [] });

      expect(result).toEqual([]);
    })
  );

  it.effect("fails on invalid response schema", () =>
    Effect.gen(function* () {
      const result = yield* parseRadarAutocompleteResponse({
        invalid: "data",
      }).pipe(Effect.either);

      expect(result._tag).toBe("Left");
    })
  );

  it.effect("handles items with missing optional fields", () =>
    Effect.gen(function* () {
      const payload = {
        addresses: [
          {
            formattedAddress: "Nowhere",
          },
        ],
      };

      const result = yield* parseRadarAutocompleteResponse(payload);

      expect(result).toEqual([
        expect.objectContaining({
          id: "radar-autocomplete:Nowhere",
          label: "Nowhere",
          address: {},
          metadata: undefined,
        }),
      ]);
    })
  );
});
