<!-- effect-solutions:start -->
## Effect Best Practices

**Before implementing Effect features**, run `effect-solutions list` and read the relevant guide.

Topics include: services and layers, data modeling, error handling, configuration, testing, HTTP clients, CLIs, observability, and project structure.

**Effect Source Reference:** `~/.local/share/effect-solutions/effect`
Search here for real implementations when docs aren't enough.

## Effect Patterns

Use Effect Patterns as a design checklist when shaping services, errors, and layering:
https://github.com/PaulJPhilp/EffectPatterns#getting-started

## Project Rules

- No barrel files (avoid index.ts re-export hubs).
- No `.js` extensions in TypeScript imports (bundler resolution is configured).
<!-- effect-solutions:end -->
