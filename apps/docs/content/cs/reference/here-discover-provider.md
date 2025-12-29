# HERE Discover provider

## Goal

Zpřístupnit HERE Discover Search API jako `AddressProvider` postavený na Effectu a `@effect/platform` HTTP klientovi.

## Prerequisites

- HERE API klíč pro Geocoding & Search.
- `HttpClient` layer (například `FetchHttpClient.layer`).

## Inputs

`HereDiscoverConfig`:

- `apiKey` (string, povinné)
- `baseUrl` (string, výchozí `https://discover.search.hereapi.com`)
- `defaultLimit` (number, výchozí `5`)
- `language` (string, volitelné, posílá se jako `lang`)
- `inArea` (string, volitelné, posílá se jako `in`)
- `at` (string nebo `{ lat: number; lng: number }`, volitelné, souřadnice `"lat,lng"`)
- `showDetails` (boolean, volitelné, nastaví `show=details`)

Mapování `AddressQuery`:

- `text` -> `q` (povinné)
- `limit` -> `limit` (přebíjí `defaultLimit`)
- `countryCode` -> `in=countryCode:${countryCode}` (přebíjí `inArea`)
- `locale` -> `lang` (přebíjí `language`)
- `sessionToken` tento provider ignoruje

Příklad:

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

Provider vrací `ReadonlyArray<AddressSuggestion>` s:

- `id`: `here-discover:${item.id}`
- `label`: `address.label` pokud existuje, jinak `title`
- `address`: odvozeno z `houseNumber`, `street`, `district`, `city`, `state`, `postalCode`, `countryCode`
- `score`: `scoring.queryScore` pokud existuje
- `metadata`: `lat`, `lng`, `resultType`, `distance` a primární kategorie pokud existují

## Errors

Chyby se mapují na `AddressProviderError` přes `makeAddressProvider`. HTTP chyby a problémy se schématy se projeví jako provider errors a suggestion služba je sbírá.

## See also

- [Core typy](/cs/reference/core-types)
- [Přidání dalšího providera](/cs/how-to/add-provider)
