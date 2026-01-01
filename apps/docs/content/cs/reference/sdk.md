# Klienti a SDK

## Cíl

Použít klienty Smart Address pro návrhy a logování přijatých návrhů.

## Předpoklady

- Base URL služby (např. `http://localhost:8787`).
- Pro HTTP klienta v Effectu: Effect runtime + HttpClient z `@effect/platform`.
- Pro browser SDK: `fetch` a `AbortController` v runtime.

## Vstupy

- Konfigurace klienta: `baseUrl`, volitelně `key` (posílá se jako `?key=`).
- Suggest request: `text` (povinné), `limit`, `countryCode`, `locale`, `sessionToken`, `strategy`.
- Accept request: `text` (povinné), `suggestion` (povinné), `limit`, `countryCode`, `locale`, `sessionToken`, `strategy`, `resultIndex`, `resultCount`.
- `accept` je dostupné přes HTTP (SDK nebo Effect service client), ne přes RPC.

## Výstup

- `suggest` vrací `{ suggestions, errors }`.
- `accept` vrací `void` a HTTP odpověď je `{ "ok": true }`.

## Chyby

- SDK vyhazuje `Error` při non-2xx odpovědi.
- Effect service client selhává s `AddressServiceClientError`.
- Runtime validace je minimální (text povinný, strategy validováno, suggestion povinné).

## Examples

### HTTP service client (Effect)

Použijte `@smart-address/integrations/service-client`, pokud už používáte Effect + `@effect/platform` v klientovi.

```ts
import { Effect } from "effect"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { makeAddressServiceClient } from "@smart-address/integrations/service-client"

const client = makeAddressServiceClient({ baseUrl: "http://localhost:8787" })

const program = client
  .suggest({ text: "Prague", limit: 5, countryCode: "CZ", strategy: "reliable" })
  .pipe(Effect.provide(FetchHttpClient.layer))

await Effect.runPromise(program)

await Effect.runPromise(
  client
    .accept({
      text: "Prague",
      strategy: "reliable",
      resultIndex: 0,
      resultCount: 5,
      suggestion: {
        id: "nominatim:123",
        label: "Prague, CZ",
        address: { city: "Prague", countryCode: "CZ" },
        source: { provider: "nominatim" }
      }
    })
    .pipe(Effect.provide(FetchHttpClient.layer))
)
```

### Effect RPC client

Použijte `@smart-address/rpc/client`, pokud preferujete RPC před HTTP. (RPC nabízí jen `suggest-address`.)

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

### Browser SDK (ESM modul)

Použijte `@smart-address/sdk` pro malého browser klienta (bez bundleru). SDK přidá `key` jako `?key=`.

```ts
import { createClient } from "@smart-address/sdk"

const client = createClient({ baseUrl: "https://api.example.com", key: "YOUR_KEY" })
const result = await client.suggest({
  text: "Prague",
  limit: 5,
  countryCode: "CZ",
  strategy: "reliable"
})

await client.accept({
  text: "Prague",
  strategy: "reliable",
  resultIndex: 0,
  resultCount: result.suggestions.length,
  suggestion: result.suggestions[0]
})
```

Module script (servíruje Smart Address služba na `/demo/sdk.js`):

```html
<script type="module">
  import { createClient } from "https://api.example.com/demo/sdk.js"

  const client = createClient({
    baseUrl: "https://api.example.com",
    key: "YOUR_KEY"
  })
</script>
```

SDK má záměrně minimální runtime validaci (text povinný, strategy validováno) a neobsahuje retry/backoff, aby zůstalo malé. Odolnost řešte ve své integraci.

Ukázka pro legacy checkout: [Bootstrap + vanilla JS](/cs/how-to/legacy-js-integration).

### React playground

Použijte SDK v React komponentě. Upravte `baseUrl` + `key` podle své služby.

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

  const handleAccept = async (suggestion, index) => {
    try {
      await client.accept({
        text: value.trim() || suggestion.label,
        strategy: "reliable",
        suggestion,
        resultIndex: index,
        resultCount: suggestions.length
      })
    } catch (error) {
      console.warn("Smart Address accept failed", error)
    }
  }

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
        API key
      </label>
      <input
        id="api-key"
        value={key}
        onChange={(event) => setKey(event.target.value)}
        placeholder="YOUR_KEY"
        style={{ width: "100%", marginBottom: "0.75rem", padding: "0.5rem" }}
      />
      <label htmlFor="address-input" style={{ display: "block", fontWeight: 600 }}>
        Address
      </label>
      <input
        id="address-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Start typing an address"
        style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
      />
      <div>
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => {
              setValue(suggestion.label)
              handleAccept(suggestion, index)
            }}
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

## Viz také

- [Service API reference](/cs/reference/service-api)
- [Použití HTTP služby](/cs/how-to/use-service)
