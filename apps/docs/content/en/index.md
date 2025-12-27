# Smart Address

Reliable address suggestions for checkout and onboarding. Built on Effect so you can compose providers, control reliability, and keep behavior deterministic.

## What you get

- Core library: provider planning, dedupe, and error collection.
- Bun service: HTTP + MCP + Effect RPC endpoints.
- Caching: in-memory L1 for dedupe, SQLite L2 for reuse.
- Data ownership: every query is stored for building your own address database.

## Start here

- [Quickstart tutorial](/tutorials/quickstart)
- [Use the HTTP service](/how-to/use-service)
- [API reference](/reference/)

## Status

- Providers: Nominatim (more coming)
- Strategies: `fast`, `reliable` (reliable-fast planned)
- SDKs: JS, React, Svelte, Vue, Web Component (planned)

## AI-friendly docs

This documentation follows the Diataxis structure and is optimized for AI tooling: each page starts with intent, lists inputs/outputs, and includes copy-paste examples.
