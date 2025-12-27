# Effect RPC

The RPC contract lives in `@smart-address/rpc` and defines a single procedure: `suggest-address`.

## Endpoint

The Bun service exposes the RPC router at `http://localhost:8787/rpc`.

```ts
import { SuggestAddressRpcGroup } from "@smart-address/rpc/suggest"
```

## Payload

The payload schema matches the HTTP API (`text`, `q`, `limit`, `countryCode`, `locale`, `sessionToken`, `strategy`).

## Client (HTTP)

```ts
import { Effect } from "effect"
import { SuggestAddressClient, SuggestAddressClientHttpLayer } from "@smart-address/rpc/client"

const program = Effect.scoped(
  SuggestAddressClient.pipe(
    Effect.flatMap((client) => client["suggest-address"]({ text: "Prague", limit: 5 })),
    Effect.provide(SuggestAddressClientHttpLayer("http://localhost:8787/rpc"))
  )
)

await Effect.runPromise(program)
```

## WebRTC

The service exposes a WebRTC-compatible socket adapter so RPC can run over data channels when you need low latency.
