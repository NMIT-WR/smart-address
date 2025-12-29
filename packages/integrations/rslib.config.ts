import { defineConfig } from "@rslib/core"

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
      source: {
        entry: {
          http: "./src/http.ts",
          "rate-limit": "./src/rate-limit.ts",
          nominatim: "./src/nominatim.ts",
          here: "./src/here.ts",
          "service-client": "./src/service-client.ts"
        }
      }
    }
  ]
})
