import { describe, expect, test } from "@effect-native/bun-test"
import { Effect } from "effect"
import * as RpcTest from "@effect/rpc/RpcTest"
import { SuggestAddressRpcGroup } from "../src/suggest"

describe("suggest rpc", () => {
  test("handles suggest-address rpc", async () => {
    const handlers = SuggestAddressRpcGroup.of({
      "suggest-address": () =>
        Effect.succeed({
          suggestions: [
            {
              id: "rpc:1",
              label: "RPC",
              address: { line1: "RPC" },
              source: { provider: "rpc" }
            }
          ],
          errors: []
        })
    })

    const program = Effect.scoped(
      RpcTest.makeClient(SuggestAddressRpcGroup).pipe(
        Effect.flatMap((client) => client["suggest-address"]({ text: "Rpc" })),
        Effect.provide(SuggestAddressRpcGroup.toLayer(handlers))
      )
    )

    const result = await Effect.runPromise(program)
    expect(result.suggestions[0]?.id).toBe("rpc:1")
  })
})
