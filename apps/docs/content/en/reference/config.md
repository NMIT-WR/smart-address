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

## Radar Autocomplete

- `RADAR_API_KEY` (string, required to enable)
- `RADAR_AUTOCOMPLETE_BASE_URL`
- `RADAR_AUTOCOMPLETE_DEFAULT_LIMIT` (number, default `5`)
- `RADAR_AUTOCOMPLETE_LAYERS` (string, optional, comma-separated)
- `RADAR_AUTOCOMPLETE_NEAR` (string, optional, `"lat,lng"` coordinates)
- `RADAR_AUTOCOMPLETE_COUNTRY_CODE` (string, optional, comma-separated)
- `RADAR_AUTOCOMPLETE_RATE_LIMIT_MS` (number, default `0`, set `0` to disable)

## HERE Discover

- `HERE_API_KEY` (string, required to enable)
- `HERE_DISCOVER_BASE_URL`
- `HERE_DISCOVER_DEFAULT_LIMIT` (number, default `5`)
- `HERE_DISCOVER_LANGUAGE` (string, optional, language code like `en` or `de`)
- `HERE_DISCOVER_IN_AREA` (string, optional, HERE `in` filter like `countryCode:GBR` or bbox)
- `HERE_DISCOVER_AT` (string, optional, `"lat,lng"` coordinates)
- `HERE_DEFAULT_LAT` (number, used with `HERE_DEFAULT_LNG`)
- `HERE_DEFAULT_LNG` (number, used with `HERE_DEFAULT_LAT`)
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

## Observability

- `SMART_ADDRESS_OTEL_ENABLED` (boolean, default `true`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` (string, default `http://localhost:4318`)
- `OTEL_SERVICE_NAME` (string, default `smart-address-service`)
- `OTEL_SERVICE_VERSION` (string, optional)
- `SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` (number, default `1` in dev, `0.05` in production)
- `SMART_ADDRESS_WIDE_EVENT_SLOW_MS` (number, default `2000`)
- `SMART_ADDRESS_LOG_RAW_QUERY` (boolean, default `true` in dev, `false` in production)

## Minimal example

Optional: add `RADAR_API_KEY` to enable Radar Autocomplete or `HERE_API_KEY` to enable HERE Discover.
If you set both `HERE_DEFAULT_LAT` and `HERE_DEFAULT_LNG`, they provide the default `at` coordinate unless `HERE_DISCOVER_AT` is set.

```bash
PORT=8787
PROVIDER_TIMEOUT_MS=4000
NOMINATIM_USER_AGENT="smart-address-dev"
NOMINATIM_EMAIL="you@example.com"
# RADAR_API_KEY="your-radar-api-key" # optional: enables Radar Autocomplete
# HERE_API_KEY="your-here-api-key" # optional: enables HERE Discover
# HERE_DEFAULT_LAT=50.087 # optional: default discover position
# HERE_DEFAULT_LNG=14.421 # optional: default discover position
```
