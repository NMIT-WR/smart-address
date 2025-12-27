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

## Planned SDKs

SDKs are planned for:

- Core JS client (framework-agnostic)
- React, Svelte, Vue
- Web Component

For now, you can use the HTTP API (any language) or the Effect clients above.
