# Clients and SDKs

## Current clients

### HTTP service client (Effect)

Use `@smart-address/integrations/service-client` when you already use Effect + `@effect/platform` in the client.

```ts
import { Effect } from "effect"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { makeAddressServiceClient } from "@smart-address/integrations/service-client"

const client = makeAddressServiceClient({ baseUrl: "http://localhost:8787" })

const program = client
  .suggest({ text: "Prague", limit: 5, countryCode: "CZ", strategy: "reliable" })
  .pipe(Effect.provide(FetchHttpClient.layer))

await Effect.runPromise(program)
```

### Effect RPC client

Use `@smart-address/rpc/client` if you prefer RPC over raw HTTP.

```ts
import { Effect } from "effect"
import { SuggestAddressClient, SuggestAddressClientHttpLayer } from "@smart-address/rpc/client"

await Effect.runPromise(
  Effect.scoped(
    SuggestAddressClient.pipe(
      Effect.flatMap((client) => client["suggest-address"]({ text: "Prague" })),
      Effect.provide(SuggestAddressClientHttpLayer("http://localhost:8787/rpc"))
    )
  )
)
```

### Browser SDK (ESM + script tag)

Use `@smart-address/sdk` for a tiny browser client (no bundler required). The SDK appends `key` as the `?key=` query param.

```ts
import { createClient } from "@smart-address/sdk"

const client = createClient({ baseUrl: "https://api.example.com", key: "YOUR_KEY" })
const result = await client.suggest({
  text: "Prague",
  limit: 5,
  countryCode: "CZ",
  strategy: "reliable"
})
```

Script tag build (UMD, global `SmartAddress`):

```html
<script src="https://unpkg.com/@smart-address/sdk/dist/umd/smart-address.js"></script>
<script>
  const client = SmartAddress.createClient({
    baseUrl: "https://api.example.com",
    key: "YOUR_KEY"
  })
</script>
```

The SDK keeps runtime validation minimal (text required, strategy validated) and does not include retries/backoff to stay small. Handle resilience in your integration.

Legacy checkout example: [Bootstrap + vanilla JS](/how-to/legacy-js-integration).

## Planned SDKs

SDKs are planned for:

- React, Svelte, Vue
- Web Component

For other languages, use the HTTP API or the Effect clients above.
