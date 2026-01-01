# Radar Autocomplete provider

## Goal

Expose the Radar autocomplete API as an `AddressProvider` powered by Effect and `@effect/platform` HTTP client.

## Prerequisites

- A Radar publishable API key with access to Maps/Search.
- An `HttpClient` layer (for example, `FetchHttpClient.layer`).

## Inputs

`RadarAutocompleteConfig`:

- `apiKey` (string, required)
- `baseUrl` (string, default `https://api.radar.io`)
- `defaultLimit` (number, default `5`)
- `layers` (string, optional, comma-separated values like `address,place`)
- `countryCode` (string, optional, ISO-3166-1 alpha-2 or comma-separated list)
- `near` (string or `{ lat: number; lng: number }`, optional, "lat,lng" coordinates)

`AddressQuery` mapping:

- `text` -> `query` (required)
- `limit` -> `limit` (overrides `defaultLimit`)
- `countryCode` -> `countryCode` (overrides config `countryCode`)
- `locale` is ignored by this provider
- `sessionToken` is ignored by this provider

Example:

```ts
import { Effect } from "effect"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { makeRadarAutocompleteProvider } from "@smart-address/integrations/radar-autocomplete"

const provider = makeRadarAutocompleteProvider({
  apiKey: "RADAR_API_KEY",
  defaultLimit: 5,
  countryCode: "US"
})

const program = provider
  .suggest({ text: "Main St", countryCode: "US" })
  .pipe(Effect.provide(FetchHttpClient.layer))

Effect.runPromise(program)
```

## Output

The provider returns `ReadonlyArray<AddressSuggestion>` with:

- `id`: derived from `formattedAddress`, coordinates, and `layer`
- `label`: `formattedAddress` when available, otherwise `placeLabel` or `addressLabel`
- `address`: derived from `number`, `street`, `neighborhood`, `city`, `state`, `postalCode`, `countryCode`
- `metadata`: `lat`, `lng`, `distance`, `layer`, and `placeLabel` when present

## Errors

Errors are mapped to `AddressProviderError` via `makeAddressProvider`. HTTP failures and schema decoding issues surface as provider errors and are collected by the suggestion service.

## See also

- [Core types](/reference/core-types)
- [Add another provider](/how-to/add-provider)
