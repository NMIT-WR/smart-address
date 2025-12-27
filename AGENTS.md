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
- Documentation follows Diataxis (tutorials, how-to, reference, explanation).
- Docs live in `apps/docs/content/en` and `apps/docs/content/cs` and must stay structurally mirrored (same pages, same paths).
- Update docs (EN + CS) whenever APIs, behavior, or versions change (also keep `README.md` and `README.cs.md` in sync).
- Write AI-friendly docs:
  - Use stable section headings (`## Goal`, `## Prerequisites`, `## Inputs`, `## Output`, `## Errors`, `## See also`).
  - Prefer explicit contracts (inputs/outputs/defaults) over narrative.
  - Include copy-paste examples that work end-to-end.
  - Keep terminology consistent with code identifiers and package exports.
<!-- effect-solutions:end -->
