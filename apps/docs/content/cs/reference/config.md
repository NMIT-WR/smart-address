# Runtime konfigurace

Environment proměnné služby (Bun). Hodnoty se čtou z procesního prostředí (`Bun.env.*`).

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

## HERE

- `HERE_API_KEY` (string, zapíná provider)
- `HERE_BASE_URL` (string, volitelný override)

## Radar

- `RADAR_API_KEY` (string, zapíná provider)
- `RADAR_BASE_URL` (string, volitelný override)

## Provideři

- `PROVIDER_ORDER` (seznam oddělený čárkou, default: `here,radar,nominatim`; použijí se jen nakonfigurovaní provideři)

## Zabezpečení

- `SUGGEST_API_KEYS` (seznam oddělený čárkou; pokud je nastaveno, `/suggest` vyžaduje `?key=...`)

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

```bash
PORT=8787
PROVIDER_TIMEOUT_MS=4000
NOMINATIM_USER_AGENT="smart-address-dev"
NOMINATIM_EMAIL="you@example.com"
```
