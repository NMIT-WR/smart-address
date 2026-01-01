import { defineConfig } from "@rslib/core";

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
      source: {
        entry: {
          suggest: "./src/suggest.ts",
          client: "./src/client.ts",
          webrtc: "./src/webrtc.ts",
        },
      },
    },
  ],
});
