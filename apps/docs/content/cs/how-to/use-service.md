# Použití HTTP služby

Cíl: získat návrhy adres přes HTTP.

## GET dotaz

```bash
curl "http://localhost:8787/suggest?text=221B%20Baker%20Street&limit=5&countryCode=GB&strategy=reliable"
```

## POST dotaz

```bash
curl -X POST "http://localhost:8787/suggest" \
  -H "content-type: application/json" \
  -d '{"text":"221B Baker Street","limit":5,"countryCode":"GB","strategy":"reliable"}'
```

## Odpověď

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

## Strategie

- `reliable` (default)
- `fast`

Použijte `strategy` nebo alias `mode`.

## Health check

```bash
curl "http://localhost:8787/health"
```
