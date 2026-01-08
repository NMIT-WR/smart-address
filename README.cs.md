# Smart Address

Spolehlivé našeptávání adres pro checkout a onboarding. Postaveno na Effectu, takže můžete vrstvit providery, řídit spolehlivost a držet deterministické chování.

> English version: `README.md`

## Co je v repozitáři

- `packages/core` (`@smart-address/core`): doménové typy, plánování providerů, deduplikace a sběr chyb.
- `packages/integrations` (`@smart-address/integrations`): integrace providerů (např. Nominatim, Radar Autocomplete, HERE Discover) + HTTP/RL pomocníci.
- `packages/rpc` (`@smart-address/rpc`): Effect RPC kontrakt + klientské utility.
- `packages/sdk` (`@smart-address/sdk`): malý klient do prohlížeče (ESM modul).
- `apps/service-bun` (`@smart-address/service-bun`): Bun služba s HTTP + MCP + RPC endpointy, cache a SQLite persistencí.
- `apps/docs`: dokumentační web (Diataxis, EN + CS).

## Quickstart (spuštění služby)

Požadavky: `pnpm` + `bun`.

Volitelně: nastavte `RADAR_API_KEY` pro zapnutí Radar Autocomplete nebo `HERE_API_KEY` pro zapnutí HERE Discover.

```bash
pnpm install

NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
RADAR_API_KEY="your-radar-api-key" \
HERE_API_KEY="your-here-api-key" \
pnpm --filter @smart-address/service-bun dev
```

Dotaz na našeptávání:

```bash
curl "http://localhost:8787/suggest?q=Praha&limit=5&countryCode=CZ"
```

Logování přijatého návrhu:

```bash
curl -X POST "http://localhost:8787/accept" \
  -H "content-type: application/json" \
  -d '{"text":"Praha","strategy":"reliable","resultIndex":0,"resultCount":5,"suggestion":{"id":"nominatim:123","label":"Praha, CZ","address":{"city":"Praha","countryCode":"CZ"},"source":{"provider":"nominatim","kind":"public"}}}'
```

Health check:

```bash
curl "http://localhost:8787/health"
```

Metriky (cache + zdraví providerů):

```bash
curl "http://localhost:8787/metrics"
```

## Observabilita (OpenTelemetry)

Smart Address posílá jeden wide event na request a trace přes Effect + OpenTelemetry.

Lokální OTEL backend (Grafana + Tempo + Loki + Prometheus + Pyroscope):

```bash
docker compose -f deploy/compose/obs.yaml up -d
```

Doporučené env proměnné:

- `SMART_ADDRESS_OTEL_ENABLED` (výchozí: `true`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` (výchozí: `http://localhost:4318`)
- `OTEL_SERVICE_NAME` (výchozí: `smart-address-service`)
- `OTEL_SERVICE_VERSION` (volitelné)
- `SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` (výchozí: `1` v dev, `0.05` v production)
- `SMART_ADDRESS_WIDE_EVENT_SLOW_MS` (výchozí: `2000`)

## SDK pro prohlížeč (module script)

```html
<script type="module">
  import { createClient } from "https://api.example.com/demo/sdk.js"

  const client = createClient({
    baseUrl: "https://api.example.com",
    key: "YOUR_KEY"
  })

  client
    .suggest({ text: "Praha", limit: 5, countryCode: "CZ", strategy: "reliable" })
    .then((result) => console.log(result.suggestions))
</script>
```

## Docker (self-hosting)

Sestavení image:

```bash
docker build -t smart-address-service .
```

Tip na tagování (doporučeno pro produkci):

```bash
docker build -t smart-address-service:$(git rev-parse --short HEAD) .
```

Spuštění přes Docker Compose (jen služba):

```bash
NOMINATIM_USER_AGENT="your-app-name" \
NOMINATIM_EMAIL="you@example.com" \
RADAR_API_KEY="your-radar-api-key" \
HERE_API_KEY="your-here-api-key" \
docker compose -f deploy/compose/app.yaml up -d
```

Tip: `docker compose` načítá `.env` v kořeni repa, takže můžete nastavit
`NOMINATIM_USER_AGENT`, `NOMINATIM_EMAIL`, `RADAR_API_KEY` a `HERE_API_KEY` tam místo inline.

Persistování SQLite DB:

- Compose mountuje volume `smart-address-data` do `/app/data`.
- Výchozí cesta DB je `data/smart-address.db` (relativně k `/app`).
- Přepište přes `SMART_ADDRESS_DB_PATH` (např. `/app/data/custom.db`).

Plná lokální observabilita (služba + LGTM):

```bash
NOMINATIM_USER_AGENT="your-app-name" \
NOMINATIM_EMAIL="you@example.com" \
RADAR_API_KEY="your-radar-api-key" \
HERE_API_KEY="your-here-api-key" \
docker compose -f deploy/compose/obs.yaml -f deploy/compose/app.yaml up -d
```

Doporučené env proměnné (zásady Nominatim):

- `NOMINATIM_USER_AGENT` (výchozí: `smart-address-service`, pokud je prázdné/nevyplněné)
- `NOMINATIM_EMAIL` (volitelné, doporučeno pro produkci)

Volitelné env proměnné:

- Radar Autocomplete: `RADAR_API_KEY`, `RADAR_AUTOCOMPLETE_BASE_URL`, `RADAR_AUTOCOMPLETE_DEFAULT_LIMIT`,
  `RADAR_AUTOCOMPLETE_LAYERS`, `RADAR_AUTOCOMPLETE_NEAR`, `RADAR_AUTOCOMPLETE_COUNTRY_CODE`,
  `RADAR_AUTOCOMPLETE_RATE_LIMIT_MS`
- HERE Discover: `HERE_API_KEY`, `HERE_DISCOVER_BASE_URL`, `HERE_DISCOVER_DEFAULT_LIMIT`,
  `HERE_DISCOVER_LANGUAGE`, `HERE_DISCOVER_IN_AREA`, `HERE_DISCOVER_AT`,
  `HERE_DEFAULT_LAT`, `HERE_DEFAULT_LNG`, `HERE_DISCOVER_RATE_LIMIT_MS`
- Nominatim: `NOMINATIM_BASE_URL`, `NOMINATIM_REFERER`, `NOMINATIM_DEFAULT_LIMIT`,
  `NOMINATIM_RATE_LIMIT_MS`
- `PORT` (výchozí `8787`), `PROVIDER_TIMEOUT_MS`
- Cache: `CACHE_L1_CAPACITY`, `CACHE_L1_TTL_MS`, `CACHE_L2_BASE_TTL_MS`, `CACHE_L2_MIN_TTL_MS`, `CACHE_L2_MAX_TTL_MS`, `CACHE_L2_SWR_MS`
- Přepsání cesty DB: `SMART_ADDRESS_DB_PATH`

## Dokumentace

- Zdroj webu: `apps/docs`
- Obsah: `apps/docs/content/en` a `apps/docs/content/cs`
- Struktura: tutorials / how-to / reference / explanation (Diataxis)

Lokální spuštění:

```bash
pnpm --filter docs dev
```

## AI tooling (MCP)

Služba publikuje MCP tool `suggest-address` na `http://localhost:8787/mcp`.

Reference: `apps/docs/content/cs/reference/mcp-tool.md`
