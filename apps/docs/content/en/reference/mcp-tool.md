# MCP tool

The service exposes an MCP tool named `suggest-address`.

## Tool name

`suggest-address`

## Inputs

- `text` (string): user query text
- `q` (string): alias for `text`
- `limit` (number)
- `countryCode` (string)
- `locale` (string)
- `sessionToken` (string)
- `strategy` ("fast" | "reliable")
- `mode` (alias for `strategy`)

## Output

The tool returns `AddressSuggestionResult`:

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
