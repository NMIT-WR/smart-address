# Smart Address Docs

Documentation site powered by Rspress.

## Development

```bash
pnpm install
pnpm --filter docs dev
```

Set `DOCS_SERVICE_BASE_URL` to point the docs proxy at the Smart Address service
(defaults to `http://localhost:8787` for local dev).

## Build

```bash
pnpm --filter docs build
```
