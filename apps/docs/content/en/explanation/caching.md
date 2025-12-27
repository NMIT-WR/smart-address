# Caching

Current cache layers:

- **L1 (in-memory)**: short TTL, request dedupe, backspace reuse.
- **L2 (SQLite)**: persisted results with TTL + SWR behavior.

We store full suggestion results in SQLite so repeated queries are cheap and we can build our own dataset over time.
