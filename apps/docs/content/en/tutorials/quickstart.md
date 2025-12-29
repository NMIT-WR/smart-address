# Quickstart

## Goal

Run the Bun service locally and fetch real address suggestions over HTTP.

## Prerequisites

- `pnpm`
- `bun`
- Nominatim usage requires a real `User-Agent` (and it’s best practice to include an email).
- Optional: set `HERE_API_KEY` to enable HERE Discover.

## Steps

### 1) Install dependencies

```bash
pnpm install
```

### 2) Start the service

```bash
NOMINATIM_USER_AGENT="smart-address-dev" \
NOMINATIM_EMAIL="you@example.com" \
pnpm --filter @smart-address/service-bun dev
```

The service starts on `http://localhost:8787` and creates a SQLite DB at `data/smart-address.db` (relative to the service working directory).

### 3) Request suggestions

```bash
curl "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"
```

You should receive JSON with `suggestions` and `errors` arrays.

### 4) Understand the result shape

- `suggestions`: the merged, deduped list of `AddressSuggestion`.
- `errors`: provider-level failures (a valid request can still return `200` with `errors` filled).

### 5) Health check

```bash
curl "http://localhost:8787/health"
```

Expected response: `ok`

## What you just used

- Provider: Nominatim (public). If `HERE_API_KEY` is set, fast uses HERE Discover and reliable uses HERE Discover with Nominatim fallback.
- Strategy: `reliable` (default)
- Cache: in-memory L1 + SQLite L2

## Next steps

- [Use the HTTP service](/how-to/use-service)
- [Add another provider](/how-to/add-provider)
- [Service reference](/reference/service-api)
