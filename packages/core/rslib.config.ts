import { defineConfig } from "@rslib/core"

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
      source: {
        entry: {
          address: "./src/address.ts",
          schema: "./src/schema.ts"
        }
      }
    }
  ]
})
