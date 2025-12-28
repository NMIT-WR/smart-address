# Runtime configuration

Service environment variables (Bun). All values are read from the process environment (`Bun.env.*`).

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

## HERE

- `HERE_API_KEY` (string, enables provider)
- `HERE_BASE_URL` (string, optional override)

## Radar

- `RADAR_API_KEY` (string, enables provider)
- `RADAR_BASE_URL` (string, optional override)

## Providers

- `PROVIDER_ORDER` (comma-separated list, default: `here,radar,nominatim`; only configured providers are used)

## Security

- `SUGGEST_API_KEYS` (comma-separated list; when set, `/suggest` requires `?key=...`)

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

```bash
PORT=8787
PROVIDER_TIMEOUT_MS=4000
NOMINATIM_USER_AGENT="smart-address-dev"
NOMINATIM_EMAIL="you@example.com"
```
