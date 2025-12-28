# Klienti a SDK

## Aktuální klienti

### HTTP service klient (Effect)

Použijte `@smart-address/integrations/service-client`, pokud už v klientovi používáte Effect + `@effect/platform`.

```ts
import { Effect } from "effect"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { makeAddressServiceClient } from "@smart-address/integrations/service-client"

const client = makeAddressServiceClient({ baseUrl: "http://localhost:8787" })

const program = client
  .suggest({ text: "Praha", limit: 5, countryCode: "CZ", strategy: "reliable" })
  .pipe(Effect.provide(FetchHttpClient.layer))

await Effect.runPromise(program)
```

### Effect RPC klient

Použijte `@smart-address/rpc/client`, pokud preferujete RPC místo raw HTTP.

```ts
import { Effect } from "effect"
import { SuggestAddressClient, SuggestAddressClientHttpLayer } from "@smart-address/rpc/client"

await Effect.runPromise(
  Effect.scoped(
    SuggestAddressClient.pipe(
      Effect.flatMap((client) => client["suggest-address"]({ text: "Praha" })),
      Effect.provide(SuggestAddressClientHttpLayer("http://localhost:8787/rpc"))
    )
  )
)
```

### SDK do prohlížeče (ESM + script tag)

Použijte `@smart-address/sdk` jako malý klient do prohlížeče (bez bundleru). SDK posílá `key` jako query parametr `?key=`.

```ts
import { createClient } from "@smart-address/sdk"

const client = createClient({ baseUrl: "https://api.example.com", key: "YOUR_KEY" })
const result = await client.suggest({
  text: "Praha",
  limit: 5,
  countryCode: "CZ",
  strategy: "reliable"
})
```

Script tag build (UMD, globální `SmartAddress`):

```html
<script src="https://unpkg.com/@smart-address/sdk/dist/umd/smart-address.js"></script>
<script>
  const client = SmartAddress.createClient({
    baseUrl: "https://api.example.com",
    key: "YOUR_KEY"
  })
</script>
```

Příklad pro legacy checkout: [Bootstrap + vanilla JS](/cs/how-to/legacy-js-integration).

## Plánované SDK

Plánované SDK:

- React, Svelte, Vue
- Web Component

Pro ostatní jazyky použijte HTTP API nebo Effect klienty výše.
