# MCP nástroj

Služba vystavuje MCP tool jménem `suggest-address` na MCP HTTP endpointu.

## Endpoint

Default: `http://localhost:8787/mcp`

## Název

`suggest-address`

## Vstupy

- Povinné: `text` (string) nebo `q` (alias)
- Volitelné:
  - `limit` (number; stringy se dekódují)
  - `countryCode` (string)
  - `locale` (string)
  - `sessionToken` (string)
  - `strategy` ("fast" | "reliable")
  - `mode` (alias pro `strategy`)

## Výstup

Návratová hodnota je `AddressSuggestionResult`:

```json
{
  "suggestions": [
    {
      "id": "nominatim:123",
      "label": "...",
      "address": { "line1": "..." },
      "source": { "provider": "nominatim", "kind": "public" }
    }
  ],
  "errors": []
}
```

Hodnota `provider` závisí na konfiguraci (například `nominatim` nebo `here-discover`, pokud je nastavené `HERE_API_KEY`).
