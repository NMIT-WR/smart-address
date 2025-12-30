# Use the HTTP service

## Goal

Fetch suggestions from the Bun service over HTTP (GET or POST).

## When to use

- You want a simple `curl`/`fetch` integration.
- You don’t want to run an Effect runtime in the client.

## Prerequisites

- Service running (default `http://localhost:8787`).

## Inputs

- Required: `text` or `q`
- Optional: `limit`, `countryCode`, `locale`, `sessionToken`, `strategy` (or `mode`)

## Steps

### 1) GET request

```bash
curl "http://localhost:8787/suggest?text=221B%20Baker%20Street&limit=5&countryCode=GB&strategy=reliable"
```

### 2) POST request (JSON)

```bash
curl -X POST "http://localhost:8787/suggest" \
  -H "content-type: application/json" \
  -d '{"text":"221B Baker Street","limit":5,"countryCode":"GB","strategy":"reliable"}'
```

### 3) POST request (form)

```bash
curl -X POST "http://localhost:8787/suggest" \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "q=221B%20Baker%20Street&limit=5&countryCode=GB&strategy=reliable"
```

## Output

```json
{
  "suggestions": [
    {
      "id": "nominatim:123",
      "label": "221B Baker Street, London, UK",
      "address": { "line1": "221B Baker Street", "city": "London" },
      "source": { "provider": "nominatim", "kind": "public" }
    }
  ],
  "errors": []
}
```

The `provider` value depends on configured providers (for example, `nominatim` or `here-discover` when `HERE_API_KEY` is set).

## Strategy

- `reliable` (default)
- `fast`

Use `strategy` or its alias `mode`.

## Errors

- Invalid payloads return `400` with `{ "error": "..." }`.
- Provider failures do **not** change the HTTP status; they appear in the `errors` array.

## Health check

```bash
curl "http://localhost:8787/health"
```

Expected response: `ok`

## See also

- [Service API reference](/reference/service-api)
