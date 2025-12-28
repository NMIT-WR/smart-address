import { defineConfig } from "@rslib/core"

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
        source: {
        entry: {
          http: "./src/http.ts",
          here: "./src/here.ts",
          "rate-limit": "./src/rate-limit.ts",
          nominatim: "./src/nominatim.ts",
          radar: "./src/radar.ts",
          "service-client": "./src/service-client.ts"
        }
      }
    }
  ]
})
