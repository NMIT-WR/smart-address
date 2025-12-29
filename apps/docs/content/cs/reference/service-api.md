# Service API

## Základní URL

Default: `http://localhost:8787`

## Endpointy

- `GET /health` (liveness)
- `GET /suggest` (query parametry)
- `POST /suggest` (JSON nebo form)

Další protokoly:

- MCP: `POST /mcp` (viz: [MCP nástroj](/cs/reference/mcp-tool))
- Effect RPC: `/rpc` (viz: [Effect RPC](/cs/reference/rpc))

## GET /suggest

### Vstupy (query parametry)

- Povinné: `text` (string) nebo `q` (alias)
- Volitelné:
  - `limit` (number; stringy se dekódují)
  - `countryCode` (ISO-3166-1 alpha-2)
  - `locale` (BCP-47)
  - `sessionToken` (string)
  - `strategy` nebo `mode` (`fast` | `reliable`)

### Příklad

```bash
curl "http://localhost:8787/suggest?q=Brno&limit=5&countryCode=CZ"
```

## POST /suggest

### Vstupy (JSON body)

Stejná pole jako `GET /suggest`.

```json
{
  "text": "Brno",
  "limit": 5,
  "countryCode": "CZ",
  "strategy": "reliable"
}
```

### Výstup (200)

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

Hodnota `provider` závisí na konfiguraci (například `nominatim` nebo `here-discover`, pokud je nastavené `HERE_API_KEY`).

## GET /health

Výstup: text `ok`

## Chyby

- Nevalidní payload vrací `400` s `{ "error": "..." }` (např. chybí `text`/`q`).
- Selhání providerů se vrací uvnitř pole `errors` s HTTP `200`.
