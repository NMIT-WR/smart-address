# Runtime configuration

Service environment variables (Bun):

## Server

- `PORT` (default `8787`)
- `PROVIDER_TIMEOUT_MS` (default `4000`)

## Nominatim

- `NOMINATIM_BASE_URL`
- `NOMINATIM_USER_AGENT` (default `smart-address-service`)
- `NOMINATIM_EMAIL`
- `NOMINATIM_REFERER`
- `NOMINATIM_DEFAULT_LIMIT`
- `NOMINATIM_RATE_LIMIT_MS` (default `1000`, set `0` to disable)

## Cache

- `CACHE_L1_CAPACITY`
- `CACHE_L1_TTL_MS`
- `CACHE_L2_BASE_TTL_MS`
- `CACHE_L2_MIN_TTL_MS`
- `CACHE_L2_MAX_TTL_MS`
- `CACHE_L2_SWR_MS`

## SQLite

- `SMART_ADDRESS_DB_PATH` (default `apps/service-bun/data/smart-address.db`)
