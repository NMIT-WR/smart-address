# Smart Address

Spolehlivé našeptávání adres pro checkout a onboarding. Postaveno na Effectu, takže můžete vrstvit providery, řídit spolehlivost a držet deterministické chování.

> English version: `README.md`

## Co je v repozitáři

- `packages/core` (`@smart-address/core`): doménové typy, plánování providerů, deduplikace a sběr chyb.
- `packages/integrations` (`@smart-address/integrations`): integrace providerů (např. Nominatim) + HTTP/RL pomocníci.
- `packages/rpc` (`@smart-address/rpc`): Effect RPC kontrakt + klientské utility.
- `apps/service-bun` (`@smart-address/service-bun`): Bun služba s HTTP + MCP + RPC endpointy, cache a SQLite persistencí.
- `apps/docs`: dokumentační web (Diataxis, EN + CS).

## Quickstart (spuštění služby)

Požadavky: `pnpm` + `bun`.

```bash
pnpm install

NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
pnpm --filter @smart-address/service-bun dev
```

Dotaz na našeptávání:

```bash
curl "http://localhost:8787/suggest?q=Praha&limit=5&countryCode=CZ"
```

Health check:

```bash
curl "http://localhost:8787/health"
```

## Konfigurace pro hosted MVP

- `HERE_API_KEY` a/nebo `RADAR_API_KEY` zapínají providery (volitelně: `HERE_BASE_URL`, `RADAR_BASE_URL`).
- `PROVIDER_ORDER` řídí pořadí providerů (seznam oddělený čárkou, např. `here,radar,nominatim`).
- `SUGGEST_API_KEYS` zapne ochranu `/suggest` přes `?key=` (seznam oddělený čárkou pro rotaci klíčů).

## Dokumentace

- Zdroj webu: `apps/docs`
- Obsah: `apps/docs/content/en` a `apps/docs/content/cs`
- Struktura: tutorials / how-to / reference / explanation (Diataxis)

Lokální spuštění:

```bash
pnpm --filter docs dev
```

## AI tooling (MCP)

Služba publikuje MCP tool `suggest-address` na `http://localhost:8787/mcp`.

Reference: `apps/docs/content/cs/reference/mcp-tool.md`
