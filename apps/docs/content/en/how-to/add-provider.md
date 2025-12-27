# Add another provider

## Goal

Implement a new `AddressProvider` and plug it into the core suggestion service (and optionally the Bun service).

## Prerequisites

- You can map your provider output into `AddressSuggestion`.
- You understand that provider errors are collected as data.

## Steps

### 1) Implement an `AddressProvider`

Use `makeAddressProvider(name, suggest)` and return an array of `AddressSuggestion`.

```ts
import { Effect } from "effect"
import {
  makeAddressProvider,
  type AddressSuggestion
} from "@smart-address/core"

const myProvider = makeAddressProvider("my-api", (query) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch("https://example.com/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(query)
      })
      const data = await response.json()
      return (data.items as Array<any>).map((item): AddressSuggestion => ({
        id: item.id,
        label: item.label,
        address: item.address,
        source: { provider: "my-api", kind: "internal" }
      }))
    },
    catch: (cause) => cause
  })
)
```

### 2) Build a provider plan

Plans let you run providers in stages (optionally with concurrency).

```ts
import { makeAddressSuggestionService, type AddressProviderPlan } from "@smart-address/core"

const plan: AddressProviderPlan = {
  stages: [
    { name: "primary", providers: [myProvider], concurrency: 2 }
  ]
}

const service = makeAddressSuggestionService(plan)
```

### 3) (Optional) Wire it into the Bun service

If you run `@smart-address/service-bun`, plug your provider into `apps/service-bun/src/service.ts` and decide which strategy should use it.

## Notes

- Return `AddressSuggestion` items only.
- Errors are collected per provider; they do not fail the whole request.
- Consider `withProviderTimeout` (core) and `withRateLimiter` (integrations) when calling external providers.

## See also

- [Core types](/reference/core-types)
- [Strategies](/explanation/strategies)
