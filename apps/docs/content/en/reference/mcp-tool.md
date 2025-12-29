# MCP tool

The service exposes an MCP tool named `suggest-address` on the MCP HTTP endpoint.

## Endpoint

Default: `http://localhost:8787/mcp`

## Tool name

`suggest-address`

## Inputs

- Required: `text` (string) or `q` (alias)
- Optional:
  - `limit` (number; strings are accepted and decoded)
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

The `provider` value depends on configured providers (for example `nominatim` or `here-discover` when `HERE_API_KEY` is set).
