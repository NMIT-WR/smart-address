# Strategies

Strategies are hints for selecting provider plans.

## What a strategy controls

- Which providers are called (and in what order).
- Concurrency and staging (e.g. try internal first, then public fallback).
- Time/cost trade-offs.

In the Bun service, strategies map to different plans in `apps/service-bun/src/service.ts`.

## fast

- Minimal provider set
- Low latency
- Good for search-as-you-type

## reliable

- Allows deeper provider nesting
- Collects more evidence before returning
- Default for checkout and onboarding

## reliable-fast (planned)

- Runs a fast plan and a reliable plan in parallel
- Returns fast results immediately
- Revalidates in the background and upgrades later
