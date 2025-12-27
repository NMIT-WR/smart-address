# Quickstart

Cíl: spustit Bun službu lokálně a získat reálné návrhy adres.

## 1. Instalace závislostí

```bash
pnpm install
```

## 2. Spuštění služby

```bash
NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
pnpm --filter @smart-address/service-bun dev
```

Služba běží na `http://localhost:8787`.

## 3. Dotaz na suggestions

```bash
curl "http://localhost:8787/suggest?q=Praha&limit=5&countryCode=CZ"
```

## 4. Co jste právě použili

- Provider: Nominatim (public)
- Strategie: `reliable`
- Cache: L1 v paměti + L2 SQLite

## Další kroky

- [Použití HTTP služby](/cs/how-to/use-service)
- [Přidání dalšího providera](/cs/how-to/add-provider)
- [Reference služby](/cs/reference/service-api)
