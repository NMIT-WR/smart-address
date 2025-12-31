import { makeClient } from "@effect/rpc/RpcTest";
import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import { SuggestAddressRpcGroup } from "../src/suggest";

describe("suggest rpc", () => {
  it.effect("handles suggest-address rpc", () =>
    Effect.gen(function* () {
      const handlers = SuggestAddressRpcGroup.of({
        "suggest-address": () =>
          Effect.succeed({
            suggestions: [
              {
                id: "rpc:1",
                label: "RPC",
                address: { line1: "RPC" },
                source: { provider: "rpc" },
              },
            ],
            errors: [],
          }),
      });

      const program = Effect.scoped(
        makeClient(SuggestAddressRpcGroup).pipe(
          Effect.flatMap((client) =>
            client["suggest-address"]({ text: "Rpc" })
          ),
          Effect.provide(SuggestAddressRpcGroup.toLayer(handlers))
        )
      );

      const result = yield* program;
      expect(result.suggestions[0]?.id).toBe("rpc:1");
    })
  );
});
