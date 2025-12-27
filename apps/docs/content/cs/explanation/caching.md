# Caching

Aktuální vrstvy cache:

- **L1 (in‑memory)**: krátké TTL, dedupe, reuse při backspace.
- **L2 (SQLite)**: perzistentní výsledky s TTL + SWR chováním.

Plné výsledky se ukládají do SQLite, takže opakované dotazy jsou levné a data lze použít pro vlastní databázi.

## Cache key

Cache položky jsou klíčované podle:

- `strategy` (např. `fast`, `reliable`)
- normalizovaného query key (viz `addressQueryKey` v `@smart-address/core`)

## Stale-while-revalidate (SWR)

L2 cache má:

- `expiresAt` (hard TTL)
- `staleAt` (SWR bod)

Pokud je položka stale, ale není expired, služba vrátí cached výsledek okamžitě a na pozadí ho refreshne.

## Konfigurace

Viz: [Runtime konfigurace](/cs/reference/config)
