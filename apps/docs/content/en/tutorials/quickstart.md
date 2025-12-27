# Quickstart

Goal: run the Bun service locally and fetch real address suggestions.

## 1. Install dependencies

```bash
pnpm install
```

## 2. Start the service

```bash
NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
pnpm --filter @smart-address/service-bun dev
```

The service starts on `http://localhost:8787`.

## 3. Request suggestions

```bash
curl "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"
```

You should receive JSON with `suggestions` and `errors` arrays.

## 4. What you just used

- Provider: Nominatim (public)
- Strategy: `reliable`
- Cache: in-memory L1 + SQLite L2

## Next steps

- [Use the HTTP service](/how-to/use-service)
- [Add another provider](/how-to/add-provider)
- [Service reference](/reference/service-api)
