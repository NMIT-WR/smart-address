# Clients and SDKs

## Current clients

### HTTP service client (Effect)

Use `@smart-address/integrations/service-client` when you already use Effect + `@effect/platform` in the client.

```ts
import { Effect } from "effect"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { makeAddressServiceClient } from "@smart-address/integrations/service-client"

const client = makeAddressServiceClient({ baseUrl: "http://localhost:8787" })

const program = client
  .suggest({ text: "Prague", limit: 5, countryCode: "CZ", strategy: "reliable" })
  .pipe(Effect.provide(FetchHttpClient.layer))

await Effect.runPromise(program)
```

### Effect RPC client

Use `@smart-address/rpc/client` if you prefer RPC over raw HTTP.

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

### Browser SDK (ESM module)

Use `@smart-address/sdk` for a tiny browser client (no bundler required). The SDK appends `key` as the `?key=` query param.

```ts
import { createClient } from "@smart-address/sdk"

const client = createClient({ baseUrl: "https://api.example.com", key: "YOUR_KEY" })
const result = await client.suggest({
  text: "Prague",
  limit: 5,
  countryCode: "CZ",
  strategy: "reliable"
})
```

Module script (served by the Smart Address service at `/demo/sdk.js`):

```html
<script type="module">
  import { createClient } from "https://api.example.com/demo/sdk.js"

  const client = createClient({
    baseUrl: "https://api.example.com",
    key: "YOUR_KEY"
  })
</script>
```

The SDK keeps runtime validation minimal (text required, strategy validated) and does not include retries/backoff to stay small. Handle resilience in your integration.

Legacy checkout example: [Bootstrap + vanilla JS](/how-to/legacy-js-integration).

### React playground

Use the SDK inside a React component. Update `baseUrl` + `key` to point at your service.

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

## Planned SDKs

SDKs are planned for:

- React, Svelte, Vue
- Web Component

For other languages, use the HTTP API or the Effect clients above.
