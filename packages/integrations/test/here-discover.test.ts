import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import { parseHereDiscoverResponse } from "../src/here-discover";

describe("here discover mapping", () => {
  it.effect("maps discover response into suggestions", () =>
    Effect.gen(function* () {
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
              countryCode: "CZE",
            },
            position: { lat: 50.087, lng: 14.421 },
            distance: 120,
            scoring: { queryScore: 0.81 },
            categories: [
              { id: "100-1000-0000", name: "Restaurant", primary: true },
            ],
          },
        ],
      };

      const result = yield* parseHereDiscoverResponse(payload);

      expect(result).toEqual([
        expect.objectContaining({
          id: "here-discover:here:cm:123",
          label: "Main St 1, Prague 11000, Czechia",
          address: expect.objectContaining({
            line1: "1 Main St",
            city: "Prague",
            countryCode: "CZE",
          }),
          metadata: expect.objectContaining({
            lat: "50.087",
            categoryName: "Restaurant",
          }),
        }),
      ]);
    })
  );

  it.effect("returns empty results when there are no items", () =>
    Effect.gen(function* () {
      const result = yield* parseHereDiscoverResponse({ items: [] });

      expect(result).toEqual([]);
    })
  );

  it.effect("fails on invalid response schema", () =>
    Effect.gen(function* () {
      const result = yield* parseHereDiscoverResponse({ invalid: "data" }).pipe(
        Effect.either
      )

      expect(result._tag).toBe("Left")
    })
  )

  it.effect("handles items with missing optional fields", () =>
    Effect.gen(function* () {
      const payload = {
        items: [
          {
            id: "here:cm:456",
            title: "Fallback Title",
          },
        ],
      };

      const result = yield* parseHereDiscoverResponse(payload);

      expect(result).toEqual([
        expect.objectContaining({
          id: "here-discover:here:cm:456",
          label: "Fallback Title",
          address: {},
          metadata: undefined,
        }),
      ]);
    })
  );

  it.effect("falls back to title when the address label is missing", () =>
    Effect.gen(function* () {
      const payload = {
        items: [
          {
            id: "here:cm:789",
            title: "Center Plaza",
            address: {
              street: "Main St",
            },
          },
        ],
      };

      const result = yield* parseHereDiscoverResponse(payload);

      expect(result).toEqual([
        expect.objectContaining({
          label: "Center Plaza",
          address: expect.objectContaining({
            line1: "Main St",
          }),
          metadata: undefined,
        }),
      ]);
    })
  );

  it.effect("omits lat/lng metadata when position is missing", () =>
    Effect.gen(function* () {
      const payload = {
        items: [
          {
            id: "here:cm:999",
            title: "No Position",
            categories: [{ id: "200-2000-0000", name: "Shop", primary: true }],
          },
        ],
      };

      const result = yield* parseHereDiscoverResponse(payload);

      expect(result).toEqual([
        expect.objectContaining({
          metadata: {
            categoryId: "200-2000-0000",
            categoryName: "Shop",
          },
        }),
      ]);
    })
  );
});
