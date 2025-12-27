# Data ownership

Every query is stored in SQLite so you can:

- build a first‑party address dataset over time
- replay/analyze searches
- reduce provider costs via caching and re-use

## What is stored

Each request is logged with:

- normalized query fields
- strategy
- suggestion count and errors
- full JSON result

## Where it is stored

The Bun service uses SQLite (default `data/smart-address.db` relative to service working directory).

Tables:

- `address_cache` (L2 cache)
- `address_search_log` (append-only search log)

## Privacy / compliance

If you store `sessionToken` or user input, treat the DB as sensitive production data and apply your usual retention/anonymization policies.
