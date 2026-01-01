# Použití HTTP služby

## Cíl

Získat návrhy adres přes HTTP (GET nebo POST).

## Kdy to použít

- Chcete jednoduchou integraci přes `curl`/`fetch`.
- Nechcete v klientovi spouštět Effect runtime.

## Požadavky

- Běžící služba (default `http://localhost:8787`).

## Vstupy

- Povinné: `text` nebo `q`
- Volitelné: `limit`, `countryCode`, `locale`, `sessionToken`, `strategy` (nebo `mode`)

## Kroky

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

## Výstup

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

## Strategie

- `reliable` (default)
- `fast`

Použijte `strategy` nebo alias `mode`.

## Chyby

- Nevalidní payload vrací `400` s `{ "error": "..." }`.
- Selhání providerů nemění HTTP status; objeví se v poli `errors`.

## Health check

```bash
curl "http://localhost:8787/health"
```

Očekávaná odpověď: `ok`

## Viz také

- [Service API reference](/cs/reference/service-api)
