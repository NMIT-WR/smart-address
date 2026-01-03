import { defineConfig } from "@rslib/core";

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
          "here-discover": "./src/here-discover.ts",
          "radar-autocomplete": "./src/radar-autocomplete.ts",
          "service-client": "./src/service-client.ts",
        },
      },
    },
  ],
});
