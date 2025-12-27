# Strategie

Strategie jsou hinty pro výběr provider planu.

## Co strategie ovlivňuje

- Kteří provideři se volají (a v jakém pořadí).
- Concurrency a staging (např. nejdřív interní, potom public fallback).
- Trade‑off mezi časem/cenou/spolehlivostí.

V Bun službě mapují strategie na plány v `apps/service-bun/src/service.ts`.

## fast

- Minimální sada providerů
- Nízká latence
- Vhodné pro search‑as‑you‑type

## reliable

- Umožňuje hlubší nesting providerů
- Sbírá více důkazů před návratem
- Default pro checkout a onboarding

## reliable-fast (plánováno)

- Spustí rychlý i spolehlivý plan paralelně
- Vrací fast výsledky hned
- Na pozadí revaliduje a výsledky upgraduje
