# MCP nástroj

Služba vystavuje MCP tool jménem `suggest-address`.

## Název

`suggest-address`

## Vstupy

- `text` (string): text dotazu
- `q` (string): alias pro `text`
- `limit` (number)
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
