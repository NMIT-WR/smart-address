import { defineConfig } from "@rslib/core";

const entry = {
  "smart-address": "./src/client.ts",
};

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
      source: {
        entry,
      },
    },
  ],
  output: {
    target: "web",
  },
});
