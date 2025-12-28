# Smart Address

Spolehlivé našeptávání adres pro checkout a onboarding. Postaveno na Effectu, takže můžete vrstvit providery, řídit spolehlivost a držet deterministické chování.

> English version: `README.md`

## Co je v repozitáři

- `packages/core` (`@smart-address/core`): doménové typy, plánování providerů, deduplikace a sběr chyb.
- `packages/integrations` (`@smart-address/integrations`): integrace providerů (např. Nominatim) + HTTP/RL pomocníci.
- `packages/rpc` (`@smart-address/rpc`): Effect RPC kontrakt + klientské utility.
- `packages/sdk` (`@smart-address/sdk`): malý klient do prohlížeče (ESM + script tag bundle).
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

## SDK pro prohlížeč (script tag)

```html
<script src="https://unpkg.com/@smart-address/sdk/dist/umd/smart-address.js"></script>
<script>
  const client = SmartAddress.createClient({
    baseUrl: "https://api.example.com",
    key: "YOUR_KEY"
  })

  client
    .suggest({ text: "Praha", limit: 5, countryCode: "CZ", strategy: "reliable" })
    .then((result) => console.log(result.suggestions))
</script>
```

## Docker (self-hosting)

Sestavení image:

```bash
docker build -t smart-address-service .
```

Tip na tagování (doporučeno pro produkci):

```bash
docker build -t smart-address-service:$(git rev-parse --short HEAD) .
```

Spuštění přes Docker Compose:

```bash
NOMINATIM_USER_AGENT="your-app-name" \
NOMINATIM_EMAIL="you@example.com" \
docker compose up -d
```

Tip: `docker compose` načítá `.env` v kořeni repa, takže můžete nastavit
`NOMINATIM_USER_AGENT` a `NOMINATIM_EMAIL` tam místo inline.

Persistování SQLite DB:

- Compose mountuje volume `smart-address-data` do `/app/data`.
- Výchozí cesta DB je `data/smart-address.db` (relativně k `/app`).
- Přepište přes `SMART_ADDRESS_DB_PATH` (např. `/app/data/custom.db`).

Doporučené env proměnné (zásady Nominatim):

- `NOMINATIM_USER_AGENT` (výchozí: `smart-address-service`, pokud je prázdné/nevyplněné)
- `NOMINATIM_EMAIL` (volitelné, doporučeno pro produkci)

Volitelné env proměnné:

- `NOMINATIM_BASE_URL`, `NOMINATIM_REFERER`, `NOMINATIM_DEFAULT_LIMIT`, `NOMINATIM_RATE_LIMIT_MS`
- `PORT` (výchozí `8787`), `PROVIDER_TIMEOUT_MS`
- Cache: `CACHE_L1_CAPACITY`, `CACHE_L1_TTL_MS`, `CACHE_L2_BASE_TTL_MS`, `CACHE_L2_MIN_TTL_MS`, `CACHE_L2_MAX_TTL_MS`, `CACHE_L2_SWR_MS`
- Přepsání cesty DB: `SMART_ADDRESS_DB_PATH`
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
