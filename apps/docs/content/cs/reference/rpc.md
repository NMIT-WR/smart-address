# Effect RPC

RPC kontrakt je v `@smart-address/rpc` a definuje proceduru `suggest-address`.

## Endpoint

Bun služba publikuje RPC router na `http://localhost:8787/rpc`.

```ts
import { SuggestAddressRpcGroup } from "@smart-address/rpc/suggest"
```

## Payload

Schema odpovídá HTTP API (`text`, `q`, `limit`, `countryCode`, `locale`, `sessionToken`, `strategy`).

## Klient (HTTP)

```ts
import { Effect } from "effect"
import { SuggestAddressClient, SuggestAddressClientHttpLayer } from "@smart-address/rpc/client"

const program = Effect.scoped(
  SuggestAddressClient.pipe(
    Effect.flatMap((client) => client["suggest-address"]({ text: "Praha", limit: 5 })),
    Effect.provide(SuggestAddressClientHttpLayer("http://localhost:8787/rpc"))
  )
)

await Effect.runPromise(program)
```

## WebRTC

Služba nabízí WebRTC socket adapter, aby šlo RPC provozovat přes data channels s minimální latencí.
