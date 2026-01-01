# Použití HTTP služby

## Goal

Získat návrhy adres a logovat přijetí přes HTTP.

## When to use

- Chcete jednoduchou integraci přes `curl`/`fetch`.
- Nechcete v klientovi spouštět Effect runtime.

## Prerequisites

- Běžící služba (default `http://localhost:8787`).

## Inputs

- Suggest request:
  - Povinné: `text` nebo `q`
  - Volitelné: `limit`, `countryCode`, `locale`, `sessionToken`, `strategy` (nebo `mode`)
- Accept request:
  - Povinné: `text` nebo `q`, `suggestion`
  - Volitelné: `limit`, `countryCode`, `locale`, `sessionToken`, `strategy` (nebo `mode`), `resultIndex`, `resultCount`

## Steps

### 1) GET dotaz

```bash
curl "http://localhost:8787/suggest?text=221B%20Baker%20Street&limit=5&countryCode=GB&strategy=reliable"
```

### 2) POST dotaz (JSON)

```bash
curl -X POST "http://localhost:8787/suggest" \
  -H "content-type: application/json" \
  -d '{"text":"221B Baker Street","limit":5,"countryCode":"GB","strategy":"reliable"}'
```

### 3) POST dotaz (form)

```bash
curl -X POST "http://localhost:8787/suggest" \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "q=221B%20Baker%20Street&limit=5&countryCode=GB&strategy=reliable"
```

### 4) POST /accept (logování výběru)

```bash
curl -X POST "http://localhost:8787/accept" \
  -H "content-type: application/json" \
  -d '{"text":"221B Baker Street","strategy":"reliable","resultIndex":0,"resultCount":5,"suggestion":{"id":"nominatim:123","label":"221B Baker Street, London, UK","address":{"line1":"221B Baker Street","city":"London"},"source":{"provider":"nominatim","kind":"public"}}}'
```

## Output

### Suggest odpověď

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

Hodnota `provider` závisí na konfiguraci (například `nominatim`, `radar-autocomplete` při `RADAR_API_KEY`, nebo `here-discover` při `HERE_API_KEY`).

### Accept odpověď

```json
{ "ok": true }
```

## Strategy

- `reliable` (default)
- `fast`

Použijte `strategy` nebo alias `mode`.

## Errors

- Nevalidní payload vrací `400` s `{ "error": "..." }`.
- Selhání providerů nemění HTTP status; objeví se v poli `errors`.

## Health check

```bash
curl "http://localhost:8787/health"
```

Očekávaná odpověď: `ok`

## See also

- [Reference Service API](/cs/reference/service-api)
