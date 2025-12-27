# Caching

Current cache layers:

- **L1 (in-memory)**: short TTL, request dedupe, backspace reuse.
- **L2 (SQLite)**: persisted results with TTL + SWR behavior.

We store full suggestion results in SQLite so repeated queries are cheap and we can build our own dataset over time.

## Cache key

Cache entries are keyed by:

- `strategy` (e.g. `fast`, `reliable`)
- a normalized query key (see `addressQueryKey` in `@smart-address/core`)

## Stale-while-revalidate (SWR)

L2 cache entries have:

- `expiresAt` (hard TTL)
- `staleAt` (SWR point)

If an entry is stale but not expired, the service returns the cached result immediately and refreshes it in the background.

## Configuration

See: [Runtime configuration](/reference/config)
