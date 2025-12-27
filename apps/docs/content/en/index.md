# Smart Address

Reliable address suggestions for checkout and onboarding. Built on Effect so you can compose providers, control reliability, and keep behavior deterministic.

The goal is a *stable result shape* (`suggestions` + `errors`) even when providers fail, time out, or return inconsistent data.

## Goal

- Provide address suggestions with predictable behavior.
- Capture provider failures as data (in `errors`), not exceptions.
- Keep integration simple: HTTP, MCP, or Effect RPC.

## Components

- `@smart-address/core`: domain types, provider planning, dedupe, error collection.
- `@smart-address/integrations`: provider adapters (e.g. Nominatim) + HTTP/rate-limit helpers.
- `@smart-address/rpc`: RPC contract + client helpers.
- `@smart-address/service-bun`: Bun service exposing HTTP + MCP + RPC endpoints, caching, and SQLite persistence.

## Quickstart (copy/paste)

### 1) Start the service

```bash
pnpm install

NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
pnpm --filter @smart-address/service-bun dev
```

### 2) Fetch suggestions

```bash
curl "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"
```

### 3) Health check

```bash
curl "http://localhost:8787/health"
```

## Start here

- [Quickstart tutorial](/tutorials/quickstart)
- [Use the HTTP service](/how-to/use-service)
- [API reference](/reference/)

## API surfaces

- HTTP: `/suggest`, `/health`
- MCP: `/mcp` exposes tool `suggest-address`
- RPC: `/rpc` exposes procedure `suggest-address`

## Status

- Providers: Nominatim (more coming)
- Strategies: `fast`, `reliable` (reliable-fast planned)
- Clients: HTTP (`fetch`/`curl`), `@smart-address/integrations/service-client`, Effect RPC (`@smart-address/rpc/client`)

## AI-friendly docs

This documentation follows the Diataxis structure and is optimized for AI tooling: stable headings, explicit inputs/outputs, and copy-paste examples.

See: [AI-friendly docs](/explanation/ai-docs)
