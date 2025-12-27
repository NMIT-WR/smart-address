# AI-friendly docs

These docs are written so both humans and AI tools can answer questions quickly.

## What “AI-friendly” means here

- A model should be able to answer “How do I…?” by quoting a single section.
- Examples should be copy/paste and include required context.
- “Reference” pages should be complete enough to generate correct code without guesswork.

Principles we follow:

- Start with intent and expected outcome.
- Define inputs, outputs, and constraints explicitly.
- Provide copy-paste examples and minimal variants.
- Keep section titles stable and descriptive for retrieval.
- Separate tutorials, how-to, reference, and explanation (Diataxis).

## Conventions used on most pages

- `## Goal`: what you will achieve.
- `## Prerequisites`: what you need before starting.
- `## Inputs` / `## Output` / `## Errors`: explicit contract.
- `## See also`: keep navigation predictable.

## When changing code

If you change APIs or behavior:

- Update the matching *reference* page (EN + CS).
- Add a short note to the relevant *explanation* page if it changes behavior or trade-offs.
