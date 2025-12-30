# HERE Discover PRD

## Goal

Vymezit rozsah a očekávání integrace HERE Discover providera a jeho zapojení do služby.

## Prerequisites

- HERE API klíč s přístupem k Geocoding & Search.
- Konfigurace služby přes env proměnné nebo `HereDiscoverConfig`.
- `HttpClient` layer dostupný v Effect runtime.

## Inputs

- `AddressQuery` pole: `text` (povinné), `limit`, `countryCode`, `locale`.
- Env proměnné služby: `HERE_API_KEY`, `HERE_DISCOVER_*`, `HERE_DEFAULT_LAT`, `HERE_DEFAULT_LNG`.
- Volitelná konfigurace providera: `at` (string nebo `{ lat; lng }`).

## Output

- Strategie `fast` používá HERE Discover, pokud je nakonfigurován; `reliable` má fallback na Nominatim.
- Výsledky jsou `AddressSuggestion` s normalizovanou adresou a metadata.

## Errors

- Prázdný nebo chybějící `HERE_API_KEY` vypne HERE provider.
- HTTP chyby a chyby dekódování schématu jsou zachycené jako provider errors.

## See also

- [HERE Discover provider](/cs/reference/here-discover-provider)
- [Runtime konfigurace](/cs/reference/config)
- [Strategie](/cs/explanation/strategies)
