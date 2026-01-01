# Smart Address

Spolehlivé našeptávání adres pro checkout a onboarding. Postaveno na Effectu, takže můžete vrstvit providery, řídit spolehlivost a držet deterministické chování.

Hlavní cíl je *stabilní tvar výsledku* (`suggestions` + `errors`), i když provider selže, time‑outne nebo vrátí nekonzistentní data.

## Cíl

- Našeptávání adres s predikovatelným chováním.
- Selhání providerů jako data (v `errors`), ne jako výjimky.
- Jednoduchá integrace: HTTP, MCP nebo Effect RPC.

## Komponenty

- `@smart-address/core`: doménové typy, plánování providerů, deduplikace, sběr chyb.
- `@smart-address/integrations`: adaptéry providerů (např. Nominatim, Radar Autocomplete, HERE Discover) + HTTP/rate‑limit helpery.
- `@smart-address/rpc`: RPC kontrakt + klientské utility.
- `@smart-address/service-bun`: Bun služba s HTTP + MCP + RPC endpointy, cache a SQLite persistencí.

## Quickstart (copy/paste)

### 1) Spuštění služby

```bash
pnpm install

NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
pnpm --filter @smart-address/service-bun dev
```

### 2) Dotaz na suggestions

```bash
curl "http://localhost:8787/suggest?q=Praha&limit=5&countryCode=CZ"
```

### 3) Health check

```bash
curl "http://localhost:8787/health"
```

## Začněte tady

- [Quickstart tutorial](/cs/tutorials/quickstart)
- [Použití HTTP služby](/cs/how-to/use-service)
- [Referenční dokumentace](/cs/reference/)

## API rozhraní

- HTTP: `/suggest`, `/accept`, `/health`
- MCP: `/mcp` publikuje tool `suggest-address`
- RPC: `/rpc` publikuje proceduru `suggest-address`

## Stav

- Provideři: Radar Autocomplete, HERE Discover, Nominatim
- Strategie: `fast`, `reliable` (reliable-fast plánujeme)
- Klienti: HTTP (`fetch`/`curl`), `@smart-address/integrations/service-client`, Effect RPC (`@smart-address/rpc/client`)

## AI-friendly docs

Dokumentace drží strukturu Diataxis a je psaná tak, aby se dobře četla i z AI nástrojů: stabilní nadpisy, explicitní vstupy/výstupy a kopírovatelné příklady.

Viz: [AI‑friendly docs](/cs/explanation/ai-docs)
