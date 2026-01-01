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

### GET /health

Output: text `ok`

## Errors

- Validation failures return `400` with `{ "error": "..." }` (example: missing `text`/`q`).
- Provider failures are returned inside the `errors` array with HTTP `200`.

## See also

- [Use the HTTP service](/how-to/use-service)
- [Clients and SDKs](/reference/sdk)
