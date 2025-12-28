# Smart Address

Reliable address suggestions for checkout and onboarding. Built on Effect so you can compose providers, control reliability, and keep behavior deterministic.

> Česká verze: `README.cs.md`

## What’s in this repo

- `packages/core` (`@smart-address/core`): domain types, provider planning, dedupe, and error collection.
- `packages/integrations` (`@smart-address/integrations`): provider adapters (e.g. Nominatim) + HTTP/RL helpers.
- `packages/rpc` (`@smart-address/rpc`): Effect RPC contract + client helpers.
- `apps/service-bun` (`@smart-address/service-bun`): Bun service exposing HTTP + MCP + RPC endpoints, caching, and SQLite persistence.
- `apps/docs`: Rspress documentation site (Diataxis, EN + CS).

## Quickstart (run the service)

Prereqs: `pnpm` + `bun`.

```bash
pnpm install

NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
pnpm --filter @smart-address/service-bun dev
```

Request suggestions:

```bash
curl "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"
```

Health check:

```bash
curl "http://localhost:8787/health"
```

## Hosted MVP security

- `SUGGEST_API_KEYS` enables `?key=` protection on `/suggest` (comma-separated for key rotation).

## Docs

- Website source: `apps/docs`
- Content: `apps/docs/content/en` and `apps/docs/content/cs`
- Structure: tutorials / how-to / reference / explanation (Diataxis)

Start docs locally:

```bash
pnpm --filter docs dev
```

## AI tooling (MCP)

The service exposes an MCP tool named `suggest-address` on `http://localhost:8787/mcp`.

Reference: `apps/docs/content/en/reference/mcp-tool.md`
