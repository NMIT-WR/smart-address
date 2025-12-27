# Architecture

Smart Address is split into three layers:

1. **Core**: provider plans, dedupe, error collection, and domain types.
2. **Service**: Bun HTTP/MCP/RPC endpoints, caching, and persistence.
3. **Integrations**: shared clients and adapters for providers.

Each layer is Effect-native and can be composed independently.

## Repository layout

- `packages/core`: provider planning + dedupe + result types.
- `packages/integrations`: provider implementations + utilities (HTTP, rate limiting, service client).
- `packages/rpc`: RPC schema and client layers.
- `apps/service-bun`: service runtime (routes, cache, SQLite, MCP, RPC).

## Data flow

1. Request arrives (`/suggest`, RPC, or MCP).
2. Query is normalized (`text`, `limit`, `countryCode`, `locale`).
3. Strategy selects a provider plan.
4. L1 cache attempts to dedupe.
5. L2 cache returns stored results or refreshes in background.
6. Results are logged into SQLite for future training and cost savings.
