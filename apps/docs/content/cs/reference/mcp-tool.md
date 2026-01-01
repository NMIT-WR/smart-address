# MCP nástroj

Služba vystavuje MCP tool jménem `suggest-address` na MCP HTTP endpointu.

## Endpoint

Default: `http://localhost:8787/mcp`

## Název

`suggest-address`

## Inputs

- Povinné: `text` (string) nebo `q` (alias)
- Volitelné:
  - `limit` (number; stringy se dekódují)
  - `countryCode` (string)
  - `locale` (string)
  - `sessionToken` (string)
  - `strategy` ("fast" | "reliable")
  - `mode` (alias pro `strategy`)

## Output

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

Hodnota `provider` závisí na konfiguraci (například `nominatim`, `radar-autocomplete` při `RADAR_API_KEY`, nebo `here-discover` při `HERE_API_KEY`).
