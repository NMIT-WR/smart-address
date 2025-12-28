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

SDK má jen minimální runtime validaci (text je povinný, `strategy` je ověřená) a neobsahuje retries/backoff, aby zůstal malý. Odolnost řešte ve vaší integraci.

Příklad pro legacy checkout: [Bootstrap + vanilla JS](/cs/how-to/legacy-js-integration).

### React playground

Použijte SDK uvnitř React komponenty. Upravte `baseUrl` + `key` tak, aby mířily na vaši službu.

```tsx playground
import React, { useEffect, useMemo, useState } from "react"
import { createClient } from "@smart-address/sdk"

const DEFAULT_BASE_URL = "http://localhost:8787"

export default function SmartAddressReactDemo() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL)
  const [key, setKey] = useState("")
  const [value, setValue] = useState("")
  const [suggestions, setSuggestions] = useState([])

  const client = useMemo(
    () => createClient({ baseUrl, key: key || undefined }),
    [baseUrl, key]
  )

  useEffect(() => {
    const text = value.trim()
    if (!text) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    const handle = setTimeout(async () => {
      try {
        const result = await client.suggest(
          {
            text,
            limit: 5,
            countryCode: "CZ",
            strategy: "reliable"
          },
          { signal: controller.signal }
        )
        setSuggestions(result.suggestions)
      } catch (error) {
        if (error && error.name === "AbortError") {
          return
        }
        console.warn("Smart Address failed", error)
        setSuggestions([])
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(handle)
    }
  }, [client, value])

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 440 }}>
      <label htmlFor="base-url" style={{ display: "block", fontWeight: 600 }}>
        Base URL
      </label>
      <input
        id="base-url"
        value={baseUrl}
        onChange={(event) => setBaseUrl(event.target.value)}
        style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
      />
      <label htmlFor="api-key" style={{ display: "block", fontWeight: 600 }}>
        API klíč
      </label>
      <input
        id="api-key"
        value={key}
        onChange={(event) => setKey(event.target.value)}
        placeholder="YOUR_KEY"
        style={{ width: "100%", marginBottom: "0.75rem", padding: "0.5rem" }}
      />
      <label htmlFor="address-input" style={{ display: "block", fontWeight: 600 }}>
        Adresa
      </label>
      <input
        id="address-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Začněte psát adresu"
        style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
      />
      <div>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => setValue(suggestion.label)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.5rem",
              border: "1px solid #e0e0e0",
              background: "white",
              marginBottom: "0.25rem",
              borderRadius: "6px"
            }}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

## Plánované SDK

Plánované SDK:

- React, Svelte, Vue
- Web Component

Pro ostatní jazyky použijte HTTP API nebo Effect klienty výše.
