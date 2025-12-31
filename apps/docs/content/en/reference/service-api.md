# Service API

## Base URL

Default: `http://localhost:8787`

## Endpoints

- `GET /health` (liveness)
- `GET /suggest` (query params)
- `POST /suggest` (JSON or form)

Other protocols:

- MCP: `POST /mcp` (see: [MCP tool](/reference/mcp-tool))
- Effect RPC: `/rpc` (see: [Effect RPC](/reference/rpc))

## GET /suggest

### Inputs (query parameters)

- Required: `text` (string) or `q` (alias)
- Optional:
  - `limit` (number; strings are accepted and decoded)
  - `countryCode` (ISO-3166-1 alpha-2)
  - `locale` (BCP-47)
  - `sessionToken` (string)
  - `strategy` or `mode` (`fast` | `reliable`)

### Example

```bash
curl "http://localhost:8787/suggest?q=Brno&limit=5&countryCode=CZ"
```

## POST /suggest

### Inputs (JSON body)

Same fields as `GET /suggest`.

```json
{
  "text": "Brno",
  "limit": 5,
  "countryCode": "CZ",
  "strategy": "reliable"
}
```

### Output (200)

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

## GET /health

Output: text `ok`

## Errors

- Validation failures return `400` with `{ "error": "..." }` (example: missing `text`/`q`).
- Provider failures are returned inside the `errors` array with HTTP `200`.
