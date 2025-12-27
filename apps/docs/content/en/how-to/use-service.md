# Use the HTTP service

Goal: fetch suggestions from the Bun service over HTTP.

## GET request

```bash
curl "http://localhost:8787/suggest?text=221B%20Baker%20Street&limit=5&countryCode=GB&strategy=reliable"
```

## POST request

```bash
curl -X POST "http://localhost:8787/suggest" \
  -H "content-type: application/json" \
  -d '{"text":"221B Baker Street","limit":5,"countryCode":"GB","strategy":"reliable"}'
```

## Response

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

## Strategy

- `reliable` (default)
- `fast`

Use `strategy` or its alias `mode`.

## Health check

```bash
curl "http://localhost:8787/health"
```
