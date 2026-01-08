# Smart Address

Reliable address suggestions for checkout and onboarding. Built on Effect so you can compose providers, control reliability, and keep behavior deterministic.

> Česká verze: `README.cs.md`

## What’s in this repo

- `packages/core` (`@smart-address/core`): domain types, provider planning, dedupe, and error collection.
- `packages/integrations` (`@smart-address/integrations`): provider adapters (e.g. Nominatim, Radar Autocomplete, HERE Discover) + HTTP/RL helpers.
- `packages/rpc` (`@smart-address/rpc`): Effect RPC contract + client helpers.
- `packages/sdk` (`@smart-address/sdk`): tiny browser client (ESM module).
- `apps/service-bun` (`@smart-address/service-bun`): Bun service exposing HTTP + MCP + RPC endpoints, caching, and SQLite persistence.
- `apps/docs`: Rspress documentation site (Diataxis, EN + CS).

## Quickstart (run the service)

Prereqs: `pnpm` + `bun`.

Optional: set `RADAR_API_KEY` to enable Radar Autocomplete or `HERE_API_KEY` to enable HERE Discover.

```bash
pnpm install

NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
RADAR_API_KEY="your-radar-api-key" \
HERE_API_KEY="your-here-api-key" \
pnpm --filter @smart-address/service-bun dev
```

Request suggestions:

```bash
curl "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"
```

Log an accepted suggestion:

```bash
curl -X POST "http://localhost:8787/accept" \
  -H "content-type: application/json" \
  -d '{"text":"Prague","strategy":"reliable","resultIndex":0,"resultCount":5,"suggestion":{"id":"nominatim:123","label":"Prague, CZ","address":{"city":"Prague","countryCode":"CZ"},"source":{"provider":"nominatim","kind":"public"}}}'
```

Health check:

```bash
curl "http://localhost:8787/health"
```

Metrics snapshot (cache + provider health):

```bash
curl "http://localhost:8787/metrics"
```

## Observability (OpenTelemetry)

Smart Address emits one wide event per request and traces via Effect + OpenTelemetry.

Run a local OTEL backend:

```bash
docker run -p 3000:3000 -p 4317:4317 -p 4318:4318 --rm -it docker.io/grafana/otel-lgtm
```

Recommended env vars:

- `SMART_ADDRESS_OTEL_ENABLED` (default: `true`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` (default: `http://localhost:4318/v1/traces`)
- `OTEL_SERVICE_NAME` (default: `smart-address-service`)
- `OTEL_SERVICE_VERSION` (optional)
- `SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` (default: `1` in dev, `0.05` in production)
- `SMART_ADDRESS_WIDE_EVENT_SLOW_MS` (default: `2000`)

## Browser SDK (module script)

```html
<script type="module">
  import { createClient } from "https://api.example.com/demo/sdk.js"

  const client = createClient({
    baseUrl: "https://api.example.com",
    key: "YOUR_KEY"
  })

  client
    .suggest({ text: "Prague", limit: 5, countryCode: "CZ", strategy: "reliable" })
    .then((result) => console.log(result.suggestions))
</script>
```

## Docker (self-hosting)

Build the image:

```bash
docker build -t smart-address-service .
```

Tagging tip (recommended for production):

```bash
docker build -t smart-address-service:$(git rev-parse --short HEAD) .
```

Run with Docker Compose:

```bash
NOMINATIM_USER_AGENT="your-app-name" \
NOMINATIM_EMAIL="you@example.com" \
RADAR_API_KEY="your-radar-api-key" \
HERE_API_KEY="your-here-api-key" \
docker compose up -d
```

Tip: `docker compose` reads `.env` in the repo root, so you can set
`NOMINATIM_USER_AGENT`, `NOMINATIM_EMAIL`, `RADAR_API_KEY`, and `HERE_API_KEY` there instead of inline.

Persist the SQLite DB:

- Compose mounts the `smart-address-data` volume to `/app/data`.
- The default DB path is `data/smart-address.db` (relative to `/app`).
- Override with `SMART_ADDRESS_DB_PATH` (for example `/app/data/custom.db`).

Recommended env vars (Nominatim usage policy):

- `NOMINATIM_USER_AGENT` (default: `smart-address-service` when unset/blank)
- `NOMINATIM_EMAIL` (optional, recommended for production use)

Optional env vars:

- Radar Autocomplete: `RADAR_API_KEY`, `RADAR_AUTOCOMPLETE_BASE_URL`, `RADAR_AUTOCOMPLETE_DEFAULT_LIMIT`,
  `RADAR_AUTOCOMPLETE_LAYERS`, `RADAR_AUTOCOMPLETE_NEAR`, `RADAR_AUTOCOMPLETE_COUNTRY_CODE`,
  `RADAR_AUTOCOMPLETE_RATE_LIMIT_MS`
- HERE Discover: `HERE_API_KEY`, `HERE_DISCOVER_BASE_URL`, `HERE_DISCOVER_DEFAULT_LIMIT`,
  `HERE_DISCOVER_LANGUAGE`, `HERE_DISCOVER_IN_AREA`, `HERE_DISCOVER_AT`,
  `HERE_DEFAULT_LAT`, `HERE_DEFAULT_LNG`, `HERE_DISCOVER_RATE_LIMIT_MS`
- Nominatim: `NOMINATIM_BASE_URL`, `NOMINATIM_REFERER`, `NOMINATIM_DEFAULT_LIMIT`,
  `NOMINATIM_RATE_LIMIT_MS`
- `PORT` (default `8787`), `PROVIDER_TIMEOUT_MS`
- Cache: `CACHE_L1_CAPACITY`, `CACHE_L1_TTL_MS`, `CACHE_L2_BASE_TTL_MS`, `CACHE_L2_MIN_TTL_MS`, `CACHE_L2_MAX_TTL_MS`, `CACHE_L2_SWR_MS`
- DB path override: `SMART_ADDRESS_DB_PATH`
## Docs

- Website source: `apps/docs`
- Content: `apps/docs/content/en` and `apps/docs/content/cs`
- Structure: tutorials / how-to / reference / explanation (Diataxis)

Start docs locally:

```bash
pnpm --filter docs dev
```

## AI tooling (MCP)

The service exposes an MCP tool named `suggest-address` on `http://localhost:8787/mcp`.

Reference: `apps/docs/content/en/reference/mcp-tool.md`
