# Přidání dalšího providera

## Cíl

Implementovat nový `AddressProvider` a napojit ho do core suggestion služby (a případně i do Bun služby).

## Předpoklady

- Umíte namapovat výstup providera na `AddressSuggestion`.
- Počítáte s tím, že chyby providerů se sbírají jako data.

## Kroky

### 1) Implementace `AddressProvider`

Použijte `makeAddressProvider(name, suggest)` a vracejte pole `AddressSuggestion`.

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

### 2) Provider plan

Plan umožní spouštět providery ve stagích (a případně paralelně).

```ts
import { makeAddressSuggestionService, type AddressProviderPlan } from "@smart-address/core"

const plan: AddressProviderPlan = {
  stages: [
    { name: "primary", providers: [myProvider], concurrency: 2 }
  ]
}

const service = makeAddressSuggestionService(plan)
```

### 3) (Volitelně) Napojení do Bun služby

Pokud běží `@smart-address/service-bun`, přidejte providera do `apps/service-bun/src/service.ts` a rozhodněte, která strategie ho používá.

## Poznámky

- Vracejte pouze `AddressSuggestion`.
- Chyby se sbírají po providerech a nepadají celé volání.
- Zvažte `withProviderTimeout` (core) a `withRateLimiter` (integrations) při volání externích providerů.

## Viz také

- [Core typy](/cs/reference/core-types)
- [Strategie](/cs/explanation/strategies)
