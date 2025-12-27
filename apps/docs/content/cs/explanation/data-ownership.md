# Vlastnictví dat

Každý dotaz se ukládá do SQLite, takže můžete:

- postupně budovat first‑party dataset adres
- replayovat/analyzovat vyhledávání
- snižovat náklady přes cache a re-use

## Co se ukládá

Každý request se ukládá spolu s:

- normalizovanými poli dotazu
- strategií
- počtem návrhů a chyb
- plným JSON výsledkem

## Kam se ukládá

Bun služba používá SQLite (default `data/smart-address.db` relativně k working directory služby).

Tabulky:

- `address_cache` (L2 cache)
- `address_search_log` (append‑only log vyhledávání)

## Privacy / compliance

Pokud ukládáte `sessionToken` nebo uživatelský vstup, berte DB jako citlivá produkční data a aplikujte své retenční/anonymizační politiky.
