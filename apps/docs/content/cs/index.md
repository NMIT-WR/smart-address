# Smart Address

Spolehlivé našeptávání adres pro checkout a onboarding. Postaveno na Effectu, takže můžete vrstvit providery, řídit spolehlivost a držet deterministické chování.

## Co dostanete

- Core knihovna: plánování providerů, deduplikace a sběr chyb.
- Bun service: HTTP + MCP + Effect RPC endpointy.
- Cache: L1 v paměti pro dedupe, L2 SQLite pro opakované dotazy.
- Vlastní data: každý dotaz se ukládá pro budování vlastní databáze.

## Začněte tady

- [Quickstart tutorial](/cs/tutorials/quickstart)
- [Použití HTTP služby](/cs/how-to/use-service)
- [Referenční dokumentace](/cs/reference/)

## Stav

- Provideři: Nominatim (další přijdou)
- Strategie: `fast`, `reliable` (reliable-fast plánujeme)
- SDK: JS, React, Svelte, Vue, Web Component (plánované)

## AI-friendly docs

Dokumentace drží strukturu Diataxis a je psaná tak, aby se dobře četla i z AI nástrojů: každá stránka má jasný cíl, vstupy/výstupy a kopírovatelné příklady.
