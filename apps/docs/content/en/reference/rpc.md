# Effect RPC

The RPC contract lives in `@smart-address/rpc` and defines a single procedure: `suggest-address`.

```ts
import { SuggestAddressRpcGroup } from "@smart-address/rpc/suggest"
```

## Payload

The payload schema matches the HTTP API (`text`, `q`, `limit`, `countryCode`, `locale`, `sessionToken`, `strategy`).

## WebRTC

The service exposes a WebRTC-compatible socket adapter so RPC can run over data channels when you need low latency.
