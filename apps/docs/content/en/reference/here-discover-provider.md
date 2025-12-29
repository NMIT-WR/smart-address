# HERE Discover provider

## Goal

Expose the HERE Discover Search API as an `AddressProvider` powered by Effect and `@effect/platform` HTTP client.

## Prerequisites

- A HERE API key with access to Geocoding & Search.
- An `HttpClient` layer (for example, `FetchHttpClient.layer`).

## Inputs

`HereDiscoverConfig`:

- `apiKey` (string, required)
- `baseUrl` (string, default `https://discover.search.hereapi.com`)
- `defaultLimit` (number, default `5`)
- `language` (string, optional, forwarded as `lang`)
- `inArea` (string, optional, forwarded as `in`)
- `at` (string, optional, `"lat,lng"` coordinates)

`AddressQuery` mapping:

- `text` -> `q` (required)
- `limit` -> `limit` (overrides `defaultLimit`)
- `countryCode` -> `in=countryCode:${countryCode}` (overrides `inArea`)
- `locale` -> `lang` (overrides `language`)
- `sessionToken` is ignored by this provider

Example:

```ts
import { Effect } from "effect"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { makeHereDiscoverProvider } from "@smart-address/integrations/here-discover"

const provider = makeHereDiscoverProvider({
  apiKey: "HERE_API_KEY",
  defaultLimit: 5
})

const program = provider
  .suggest({ text: "Main St", countryCode: "CZ" })
  .pipe(Effect.provide(FetchHttpClient.layer))

Effect.runPromise(program)
```

## Output

The provider returns `ReadonlyArray<AddressSuggestion>` with:

- `id`: `here-discover:${item.id}`
- `label`: `address.label` when available, otherwise `title`
- `address`: derived from `houseNumber`, `street`, `district`, `city`, `state`, `postalCode`, `countryCode`
- `score`: `scoring.queryScore` when present
- `metadata`: `lat`, `lng`, `resultType`, `distance`, and primary category identifiers when present

## Errors

Errors are mapped to `AddressProviderError` via `makeAddressProvider`. HTTP failures and schema decoding issues surface as provider errors and are collected by the suggestion service.

## See also

- [Core types](/reference/core-types)
- [Add another provider](/how-to/add-provider)
