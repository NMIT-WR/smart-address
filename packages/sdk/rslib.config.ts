import { defineConfig } from "@rslib/core"

const entry = {
  "smart-address": "./src/client.ts"
}

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
      source: {
        entry
      }
    },
    {
      format: "umd",
      bundle: true,
      umdName: "SmartAddress",
      source: {
        entry
      },
      output: {
        distPath: {
          root: "./dist/umd"
        }
      }
    }
  ],
  output: {
    target: "web"
  }
})
