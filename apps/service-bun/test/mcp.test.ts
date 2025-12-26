import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { McpServer } from "@effect/ai"
import { AddressCachedSuggestor } from "../src/cache"
import { AddressMcpHandlersLayer, AddressMcpToolkit } from "../src/mcp"

const sampleResult = {
  suggestions: [
    {
      id: "demo:1",
      label: "Demo",
      address: { line1: "Demo" },
      source: { provider: "demo" }
    }
  ],
  errors: []
}

const suggestor = {
  suggest: () => Effect.succeed(sampleResult)
}

describe("mcp toolkit", () => {
  it("registers suggest-address tool metadata", async () => {
    const tools = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const server = yield* McpServer.McpServer
          yield* McpServer.registerToolkit(AddressMcpToolkit)
          return server.tools
        }).pipe(Effect.provide(AddressMcpHandlersLayer), Effect.provide(McpServer.McpServer.layer))
      )
    )

    const suggestTool = tools.find((tool) => tool.name === "suggest-address")
    const inputSchema = suggestTool?.inputSchema as
      | {
          properties?: Record<string, { description?: string }>
        }
      | undefined

    expect(suggestTool?.description).toBe("Suggest addresses using configured providers and strategies.")
    expect(inputSchema?.properties?.text?.description).toBe(
      "User query text, e.g. '221B Baker Street'."
    )
    expect(inputSchema?.properties?.q?.description).toBe(
      "Alias for text. If both are provided, text wins."
    )
  })

  it("handles suggest-address tool calls", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const toolkit = yield* AddressMcpToolkit
        return yield* toolkit.handle("suggest-address", { text: "Demo" })
      }).pipe(
        Effect.provide(AddressMcpHandlersLayer),
        Effect.provideService(AddressCachedSuggestor, suggestor)
      )
    )

    expect(result.result).toMatchObject(sampleResult)
  })

})
