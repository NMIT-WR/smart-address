# Service API

## Goal

Document the HTTP endpoints for suggestions and acceptance logging.

## Prerequisites

- Service running (default base URL: `http://localhost:8787`).

## Inputs

### Base URL

Default: `http://localhost:8787`

### Endpoints

- `GET /health` (liveness)
- `GET /suggest` (query params)
- `POST /suggest` (JSON or form)
- `POST /accept` (JSON)
- `GET /metrics` (JSON or Prometheus text)

Other protocols:

- MCP: `POST /mcp` (see: [MCP tool](/reference/mcp-tool))
- Effect RPC: `/rpc` (see: [Effect RPC](/reference/rpc))

### GET /suggest (query parameters)

- Required: `text` (string) or `q` (alias)
- Optional:
  - `limit` (number; strings are accepted and decoded)
  - `countryCode` (ISO-3166-1 alpha-2)
  - `locale` (BCP-47)
  - `sessionToken` (string)
  - `strategy` or `mode` (`fast` | `reliable`)

Example:

```bash
curl "http://localhost:8787/suggest?q=Brno&limit=5&countryCode=CZ"
```

### POST /suggest (JSON body or form)

Same fields as `GET /suggest`.

```json
{
  "text": "Brno",
  "limit": 5,
  "countryCode": "CZ",
  "strategy": "reliable"
}
```

### POST /accept (JSON body)

- Required:
  - `text` (string) or `q` (alias)
  - `suggestion` (an `AddressSuggestion` from `/suggest`)
- Content-Type: `application/json`
- Optional:
  - `limit` (number; strings are accepted and decoded)
  - `countryCode` (ISO-3166-1 alpha-2)
  - `locale` (BCP-47)
  - `sessionToken` (string)
  - `strategy` or `mode` (`fast` | `reliable`)
  - `resultIndex` (number; 0-based index in the results list)
  - `resultCount` (number; total results returned)

```json
{
  "text": "Praha 1",
  "strategy": "reliable",
  "resultIndex": 0,
  "resultCount": 5,
  "suggestion": {
    "id": "nominatim:123",
    "label": "Praha 1, CZ",
    "address": { "city": "Praha", "countryCode": "CZ" },
    "source": { "provider": "nominatim", "kind": "public" }
  }
}
```

### GET /metrics

Returns a JSON snapshot of cache and provider metrics for internal monitoring.
If the `Accept` header includes `text/plain` or `application/openmetrics-text`,
the endpoint responds in Prometheus text format.

```bash
curl "http://localhost:8787/metrics"
```

Prometheus scrape example:

```bash
curl -H "accept: text/plain" "http://localhost:8787/metrics"
```

## Output

### GET /suggest and POST /suggest (200)

```json
{
  "suggestions": [
    {
      "id": "nominatim:123",
      "label": "Brno, Czechia",
      "address": { "city": "Brno", "countryCode": "CZ" },
      "source": { "provider": "nominatim", "kind": "public" }
    }
  ],
  "errors": []
}
```

The `provider` value depends on configured providers (for example, `nominatim`, `radar-autocomplete` when `RADAR_API_KEY` is set, or `here-discover` when `HERE_API_KEY` is set).

### POST /accept (200)

```json
{ "ok": true }
```

### GET /metrics (200)

```json
{
  "startedAt": 1710000000000,
  "updatedAt": 1710000300000,
  "cache": {
    "requests": 120,
    "hits": 85,
    "l1Hits": 60,
    "l1Misses": 60,
    "l2Hits": 25,
    "l2Misses": 35,
    "hitRate": 0.7083,
    "l1HitRate": 0.5,
    "l2HitRate": 0.4167
  },
  "providers": [
    {
      "provider": "nominatim",
      "calls": 80,
      "errors": 4,
      "errorRate": 0.05,
      "latencyMs": { "avg": 210, "min": 120, "max": 480 }
    }
  ]
}
```

### GET /metrics (200, Prometheus text)

```
smart_address_cache_requests_total 120
smart_address_cache_hits_total 85
smart_address_provider_calls_total{provider="nominatim"} 80
```

### GET /health

Output: text `ok`

## Errors

- Validation failures return `400` with `{ "error": "..." }` (example: missing `text`/`q`).
- Provider failures are returned inside the `errors` array with HTTP `200`.

## See also

- [Use the HTTP service](/how-to/use-service)
- [Clients and SDKs](/reference/sdk)
