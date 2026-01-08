# Service API

## Cíl

Zdokumentovat HTTP endpointy pro návrhy a logování přijetí.

## Předpoklady

- Běžící služba (defaultní base URL: `http://localhost:8787`).

## Vstupy

### Base URL

Default: `http://localhost:8787`

### Endpoints

- `GET /health` (liveness)
- `GET /suggest` (query parametry)
- `POST /suggest` (JSON nebo form)
- `POST /accept` (JSON)
- `GET /metrics` (JSON nebo Prometheus text)

Další protokoly:

- MCP: `POST /mcp` (viz: [MCP nástroj](/cs/reference/mcp-tool))
- Effect RPC: `/rpc` (viz: [Effect RPC](/cs/reference/rpc))

### GET /suggest (query parametry)

- Povinné: `text` (string) nebo `q` (alias)
- Volitelné:
  - `limit` (number; stringy se dekódují)
  - `countryCode` (ISO-3166-1 alpha-2)
  - `locale` (BCP-47)
  - `sessionToken` (string)
  - `strategy` nebo `mode` (`fast` | `reliable`)

Příklad:

```bash
curl "http://localhost:8787/suggest?q=Brno&limit=5&countryCode=CZ"
```

### POST /suggest (JSON body nebo form)

Stejná pole jako `GET /suggest`.

```json
{
  "text": "Brno",
  "limit": 5,
  "countryCode": "CZ",
  "strategy": "reliable"
}
```

### POST /accept (JSON body)

- Povinné:
  - `text` (string) nebo `q` (alias)
  - `suggestion` (objekt `AddressSuggestion` z `/suggest`)
- Content-Type: `application/json`
- Volitelné:
  - `limit` (number; stringy se dekódují)
  - `countryCode` (ISO-3166-1 alpha-2)
  - `locale` (BCP-47)
  - `sessionToken` (string)
  - `strategy` nebo `mode` (`fast` | `reliable`)
  - `resultIndex` (number; 0-based index v seznamu)
  - `resultCount` (number; celkový počet vrácených výsledků)

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

Vrací JSON snapshot metrik cache a providerů pro interní monitoring.
Pokud `Accept` obsahuje `text/plain` nebo `application/openmetrics-text`,
endpoint vrací Prometheus text formát.

```bash
curl "http://localhost:8787/metrics"
```

Prometheus scrape příklad:

```bash
curl -H "accept: text/plain" "http://localhost:8787/metrics"
```

## Výstup

### GET /suggest a POST /suggest (200)

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

Hodnota `provider` závisí na konfiguraci (například `nominatim`, `radar-autocomplete` při `RADAR_API_KEY`, nebo `here-discover` při `HERE_API_KEY`).

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

Výstup: text `ok`

## Chyby

- Nevalidní payload vrací `400` s `{ "error": "..." }` (např. chybí `text`/`q`).
- Selhání providerů se vrací uvnitř pole `errors` s HTTP `200`.

## Viz také

- [Použití HTTP služby](/cs/how-to/use-service)
- [Klienti a SDK](/cs/reference/sdk)
