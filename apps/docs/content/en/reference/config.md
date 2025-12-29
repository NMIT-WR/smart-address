# Runtime configuration

Service environment variables. All values are read from the process environment.

## Server

- `PORT` (number, default `8787`)
- `PROVIDER_TIMEOUT_MS` (number, default `4000`)

## Nominatim

- `NOMINATIM_BASE_URL`
- `NOMINATIM_USER_AGENT` (string, default `smart-address-service`)
- `NOMINATIM_EMAIL`
- `NOMINATIM_REFERER`
- `NOMINATIM_DEFAULT_LIMIT` (number, default `5`)
- `NOMINATIM_RATE_LIMIT_MS` (number, default `1000`, set `0` to disable)

## HERE Discover

- `HERE_API_KEY` (string, required to enable)
- `HERE_DISCOVER_BASE_URL`
- `HERE_DISCOVER_DEFAULT_LIMIT` (number, default `5`)
- `HERE_DISCOVER_LANGUAGE`
- `HERE_DISCOVER_IN_AREA`
- `HERE_DISCOVER_AT`
- `HERE_DISCOVER_RATE_LIMIT_MS` (number, default `0`, set `0` to disable)

## Cache

- `CACHE_L1_CAPACITY` (number, default `500`)
- `CACHE_L1_TTL_MS` (number, default `10000`)
- `CACHE_L2_BASE_TTL_MS` (number, default `1800000`)
- `CACHE_L2_MIN_TTL_MS` (number, default `120000`)
- `CACHE_L2_MAX_TTL_MS` (number, default `43200000`)
- `CACHE_L2_SWR_MS` (number, default `300000`)

## SQLite

- `SMART_ADDRESS_DB_PATH` (string, default `data/smart-address.db` relative to the service working directory)

## Minimal example

Optional: add `HERE_API_KEY` to enable HERE Discover.

```bash
PORT=8787
PROVIDER_TIMEOUT_MS=4000
NOMINATIM_USER_AGENT="smart-address-dev"
NOMINATIM_EMAIL="you@example.com"
# HERE_API_KEY="your-here-api-key" # optional: enables HERE Discover
```
