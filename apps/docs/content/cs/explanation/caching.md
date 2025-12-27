# Caching

Aktuální vrstvy cache:

- **L1 (in‑memory)**: krátké TTL, dedupe, reuse při backspace.
- **L2 (SQLite)**: perzistentní výsledky s TTL + SWR chováním.

Plné výsledky se ukládají do SQLite, takže opakované dotazy jsou levné a data lze použít pro vlastní databázi.
