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

## Plánované SDK

Plánované SDK:

- Core JS klient (framework‑agnostic)
- React, Svelte, Vue
- Web Component

Do té doby můžete používat HTTP API (jakýkoliv jazyk) nebo Effect klienty výše.
