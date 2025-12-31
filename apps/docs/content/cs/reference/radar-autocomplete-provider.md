# Radar Autocomplete provider

## Goal

Zpřístupnit Radar autocomplete API jako `AddressProvider` postavený na Effectu a `@effect/platform` HTTP klientovi.

## Prerequisites

- Radar publishable API klíč s přístupem k Maps/Search.
- `HttpClient` layer (například `FetchHttpClient.layer`).

## Inputs

`RadarAutocompleteConfig`:

- `apiKey` (string, povinné)
- `baseUrl` (string, výchozí `https://api.radar.io`)
- `defaultLimit` (number, výchozí `5`)
- `layers` (string, volitelné, CSV jako `address,place`)
- `countryCode` (string, volitelné, ISO-3166-1 alpha-2 nebo CSV)
- `near` (string nebo `{ lat: number; lng: number }`, volitelné, souřadnice "lat,lng")

Mapování `AddressQuery`:

- `text` -> `query` (povinné)
- `limit` -> `limit` (přebíjí `defaultLimit`)
- `countryCode` -> `countryCode` (přebíjí config `countryCode`)
- `locale` tento provider ignoruje
- `sessionToken` tento provider ignoruje

Příklad:

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

Provider vrací `ReadonlyArray<AddressSuggestion>` s:

- `id`: odvozeno z `formattedAddress`, souřadnic a `layer`
- `label`: `formattedAddress` pokud existuje, jinak `placeLabel` nebo `addressLabel`
- `address`: odvozeno z `number`, `street`, `neighborhood`, `city`, `state`, `postalCode`, `countryCode`
- `metadata`: `lat`, `lng`, `distance`, `layer` a `placeLabel` pokud existují

## Errors

Chyby se mapují na `AddressProviderError` přes `makeAddressProvider`. HTTP chyby a problémy se schématy se projeví jako provider errors a suggestion služba je sbírá.

## See also

- [Core typy](/cs/reference/core-types)
- [Přidání dalšího providera](/cs/how-to/add-provider)
