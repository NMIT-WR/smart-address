# Service API

Základní URL: `http://localhost:8787`

## GET /suggest

Query parametry:

- `text` (string, povinný) nebo `q` (alias)
- `limit` (number)
- `countryCode` (ISO-3166-1 alpha-2)
- `locale` (BCP-47)
- `sessionToken` (string)
- `strategy` nebo `mode` (`fast` | `reliable`)

Příklad:

```bash
curl "http://localhost:8787/suggest?q=Brno&limit=5&countryCode=CZ"
```

## POST /suggest

JSON body (stejná pole):

```json
{
  "text": "Brno",
  "limit": 5,
  "countryCode": "CZ",
  "strategy": "reliable"
}
```

## Odpověď

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
