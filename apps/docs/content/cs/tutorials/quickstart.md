# Quickstart

## Cíl

Spustit Bun službu lokálně a získat reálné návrhy adres přes HTTP.

## Předpoklady

- `pnpm`
- `bun`
- Pro Nominatim je potřeba reálný `User-Agent` (a ideálně i email).
- Volitelně: nastavte `HERE_API_KEY` pro zapnutí HERE Discover.

## Kroky

### 1) Instalace závislostí

```bash
pnpm install
```

### 2) Spuštění služby

```bash
NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
pnpm --filter @smart-address/service-bun dev
```

Služba běží na `http://localhost:8787` a vytvoří SQLite DB v `data/smart-address.db` (relativně vůči working directory služby).

### 3) Dotaz na suggestions

```bash
curl "http://localhost:8787/suggest?q=Praha&limit=5&countryCode=CZ"
```

### 4) Jak číst výsledek

- `suggestions`: sloučený, deduplikovaný seznam `AddressSuggestion`.
- `errors`: chyby jednotlivých providerů (validní request může vrátit `200` a zároveň mít vyplněné `errors`).

### 5) Health check

```bash
curl "http://localhost:8787/health"
```

Očekávaná odpověď: `ok`

## Co jste právě použili

- Provider: Nominatim (public). Pokud je `HERE_API_KEY` nastavený, fast používá HERE Discover a reliable používá HERE Discover s Nominatim fallbackem.
- Strategie: `reliable` (default)
- Cache: L1 v paměti + L2 SQLite

## Další kroky

- [Použití HTTP služby](/cs/how-to/use-service)
- [Přidání dalšího providera](/cs/how-to/add-provider)
- [Reference služby](/cs/reference/service-api)
