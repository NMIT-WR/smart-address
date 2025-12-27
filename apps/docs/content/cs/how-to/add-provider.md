# Přidání dalšího providera

Cíl: připojit nový provider do core suggestion služby.

```ts
import { Effect } from "effect"
import {
  makeAddressProvider,
  makeAddressSuggestionService,
  type AddressProviderPlan
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
      return data.items.map((item: any) => ({
        id: item.id,
        label: item.label,
        address: item.address,
        source: { provider: "my-api", kind: "internal" }
      }))
    },
    catch: (cause) => cause
  })
)

const plan: AddressProviderPlan = {
  stages: [
    { name: "primary", providers: [myProvider], concurrency: 2 }
  ]
}

const service = makeAddressSuggestionService(plan)
```

Tipy:

- Vracejte pouze `AddressSuggestion`.
- Chyby se sbírají po providerech a nepadají celé volání.
- Stages využijte pro nesting a spolehlivost.
