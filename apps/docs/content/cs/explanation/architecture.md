# Architektura

Smart Address je rozdělen do tří vrstev:

1. **Core**: plánování providerů, deduplikace, sběr chyb, doménové typy.
2. **Service**: Bun HTTP/MCP/RPC endpointy, cache a persistence.
3. **Integrations**: sdílení klienti a adaptéry pro providery.

Každá vrstva je Effect‑native a dá se skládat samostatně.

## Data flow

1. Příchozí request (`/suggest`, RPC nebo MCP).
2. Normalizace query (`text`, `limit`, `countryCode`, `locale`).
3. Strategie vybere provider plan.
4. L1 cache se pokusí o dedupe.
5. L2 cache vrátí uložené výsledky nebo provede refresh.
6. Výsledky se zapisují do SQLite pro budování vlastních dat.
