# HERE Discover PRD

## Goal

Define the scope and expectations for the HERE Discover provider integration and its service wiring.

## Prerequisites

- A HERE API key with access to Geocoding & Search.
- Service configuration via environment variables or `HereDiscoverConfig`.
- An `HttpClient` layer available in the Effect runtime.

## Inputs

- `AddressQuery` fields: `text` (required), `limit`, `countryCode`, `locale`.
- Service env vars: `HERE_API_KEY`, `HERE_DISCOVER_*`, `HERE_DEFAULT_LAT`, `HERE_DEFAULT_LNG`.
- Optional provider config: `at` (string or `{ lat; lng }`), `showDetails`.

## Output

- `fast` strategy uses HERE Discover when configured; `reliable` falls back to Nominatim.
- Suggestions are returned as `AddressSuggestion` with normalized address fields and metadata.
- When `showDetails` is enabled, HERE responses include `show=details`.

## Errors

- Empty or missing `HERE_API_KEY` disables the HERE provider.
- HTTP failures and schema decode issues surface as provider errors and are collected.

## See also

- [HERE Discover provider](/reference/here-discover-provider)
- [Runtime configuration](/reference/config)
- [Strategies](/explanation/strategies)
