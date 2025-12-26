import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@smart-address\/core\/schema$/,
        replacement: path.resolve(__dirname, "packages/core/src/schema.ts")
      },
      {
        find: /^@smart-address\/core$/,
        replacement: path.resolve(__dirname, "packages/core/src/address.ts")
      },
      {
        find: /^@smart-address\/integrations\/rate-limit$/,
        replacement: path.resolve(__dirname, "packages/integrations/src/rate-limit.ts")
      },
      {
        find: /^@smart-address\/integrations\/nominatim$/,
        replacement: path.resolve(__dirname, "packages/integrations/src/nominatim.ts")
      },
      {
        find: /^@smart-address\/integrations\/service-client$/,
        replacement: path.resolve(__dirname, "packages/integrations/src/service-client.ts")
      },
      {
        find: /^@smart-address\/integrations\/http$/,
        replacement: path.resolve(__dirname, "packages/integrations/src/http.ts")
      },
      {
        find: /^@smart-address\/integrations$/,
        replacement: path.resolve(__dirname, "packages/integrations/src/http.ts")
      },
      {
        find: /^@smart-address\/rpc\/suggest$/,
        replacement: path.resolve(__dirname, "packages/rpc/src/suggest.ts")
      },
      {
        find: /^@smart-address\/rpc\/client$/,
        replacement: path.resolve(__dirname, "packages/rpc/src/client.ts")
      },
      {
        find: /^@smart-address\/rpc\/webrtc$/,
        replacement: path.resolve(__dirname, "packages/rpc/src/webrtc.ts")
      },
      {
        find: /^@smart-address\/rpc$/,
        replacement: path.resolve(__dirname, "packages/rpc/src/suggest.ts")
      }
    ]
  },
  test: {
    environment: "node",
    include: ["packages/**/test/**/*.test.ts", "apps/**/test/**/*.test.ts"]
  }
})
