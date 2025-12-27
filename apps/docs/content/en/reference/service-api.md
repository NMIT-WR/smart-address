# Service API

Base URL: `http://localhost:8787`

## GET /suggest

Query parameters:

- `text` (string, required) or `q` (alias)
- `limit` (number)
- `countryCode` (ISO-3166-1 alpha-2)
- `locale` (BCP-47)
- `sessionToken` (string)
- `strategy` or `mode` (`fast` | `reliable`)

Example:

```bash
curl "http://localhost:8787/suggest?q=Brno&limit=5&countryCode=CZ"
```

## POST /suggest

JSON body (same fields as above):

```json
{
  "text": "Brno",
  "limit": 5,
  "countryCode": "CZ",
  "strategy": "reliable"
}
```

## Response

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

## GET /health

```json
{ "status": "ok" }
```
