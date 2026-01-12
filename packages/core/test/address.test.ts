import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import {
  type AddressProviderPlan,
  makeAddressProvider,
  makeAddressSuggestionService,
  normalizeAddressQuery,
} from "../src/address";
import {
  type RecordedSpan,
  makeTestTracer,
} from "../../../test-utils/test-tracer";

describe("address core", () => {
  it("normalizes address queries", () => {
    const normalized = normalizeAddressQuery({
      text: "  Main St ",
      limit: 4.7,
      countryCode: " cz ",
    });

    expect(normalized).toEqual({
      text: "Main St",
      limit: 4,
      countryCode: "CZ",
    });
  });

  it.effect("dedupes providers and respects limit", () =>
    Effect.gen(function* () {
      const providerA = makeAddressProvider("a", () =>
        Effect.succeed([
          {
            id: "one",
            label: "One",
            address: {},
            source: { provider: "a" },
          },
          {
            id: "two",
            label: "Two",
            address: {},
            source: { provider: "a" },
          },
        ])
      );
      const providerB = makeAddressProvider("b", () =>
        Effect.succeed([
          {
            id: "two",
            label: "Two",
            address: {},
            source: { provider: "b" },
          },
          {
            id: "three",
            label: "Three",
            address: {},
            source: { provider: "b" },
          },
        ])
      );

      const plan: AddressProviderPlan = {
        stages: [{ providers: [providerA] }, { providers: [providerB] }],
      };

      const service = makeAddressSuggestionService(plan);
      const result = yield* service.suggest({ text: "Main", limit: 2 });

      expect(result.suggestions.map((item) => item.id)).toEqual(["one", "two"]);
      expect(result.errors).toEqual([]);
    })
  );

  it.effect("collects provider errors without failing", () =>
    Effect.gen(function* () {
      const provider = makeAddressProvider("boom", () =>
        Effect.fail(new Error("nope"))
      );
      const service = makeAddressSuggestionService([provider]);
      const result = yield* service.suggest({ text: "Main" });

      expect(result.suggestions).toEqual([]);
      expect(result.errors).toEqual([{ provider: "boom", message: "nope" }]);
    })
  );

  it.effect("annotates provider spans on failure", () =>
    Effect.gen(function* () {
      const spans: RecordedSpan[] = [];
      const tracer = makeTestTracer(spans);
      const provider = makeAddressProvider("boom", () =>
        Effect.fail(new Error("nope"))
      );
      const service = makeAddressSuggestionService([provider]);

      yield* service.suggest({ text: "Main" }).pipe(Effect.withTracer(tracer));

      const providerSpan = spans.find(
        (span) => span.name === "address.provider"
      );

      expect(providerSpan?.attributes.get("provider.error")).toBe(true);
      expect(providerSpan?.attributes.get("provider.error_message")).toBe(
        "nope"
      );
    })
  );
});
