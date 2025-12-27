# Effect RPC

RPC kontrakt je v `@smart-address/rpc` a definuje proceduru `suggest-address`.

```ts
import { SuggestAddressRpcGroup } from "@smart-address/rpc/suggest"
```

## Payload

Schema odpovídá HTTP API (`text`, `q`, `limit`, `countryCode`, `locale`, `sessionToken`, `strategy`).

## WebRTC

Služba nabízí WebRTC socket adapter, aby šlo RPC provozovat přes data channels s minimální latencí.
