# Runtime konfigurace

Environment proměnné služby. Hodnoty se čtou z procesního prostředí.

## Server

- `PORT` (number, default `8787`)
- `PROVIDER_TIMEOUT_MS` (number, default `4000`)

## Nominatim

- `NOMINATIM_BASE_URL`
- `NOMINATIM_USER_AGENT` (string, default `smart-address-service`)
- `NOMINATIM_EMAIL`
- `NOMINATIM_REFERER`
- `NOMINATIM_DEFAULT_LIMIT` (number, default `5`)
- `NOMINATIM_RATE_LIMIT_MS` (number, default `1000`, `0` = vypnout)

## HERE Discover

- `HERE_API_KEY` (string, povinné pro zapnutí)
- `HERE_DISCOVER_BASE_URL`
- `HERE_DISCOVER_DEFAULT_LIMIT` (number, default `5`)
- `HERE_DISCOVER_LANGUAGE`
- `HERE_DISCOVER_IN_AREA`
- `HERE_DISCOVER_AT`
- `HERE_DISCOVER_RATE_LIMIT_MS` (number, default `0`, `0` = vypnout)

## Cache

- `CACHE_L1_CAPACITY` (number, default `500`)
- `CACHE_L1_TTL_MS` (number, default `10000`)
- `CACHE_L2_BASE_TTL_MS` (number, default `1800000`)
- `CACHE_L2_MIN_TTL_MS` (number, default `120000`)
- `CACHE_L2_MAX_TTL_MS` (number, default `43200000`)
- `CACHE_L2_SWR_MS` (number, default `300000`)

## SQLite

- `SMART_ADDRESS_DB_PATH` (string, default `data/smart-address.db` relativně k working directory služby)

## Minimální příklad

Volitelně přidejte `HERE_API_KEY` pro zapnutí HERE Discover.

```bash
PORT=8787
PROVIDER_TIMEOUT_MS=4000
NOMINATIM_USER_AGENT="smart-address-dev"
NOMINATIM_EMAIL="you@example.com"
# HERE_API_KEY="your-here-api-key" # volitelné: zapne HERE Discover
```
