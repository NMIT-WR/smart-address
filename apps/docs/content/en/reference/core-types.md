# Core types

All core types live in `@smart-address/core` (and the schemas live in `@smart-address/core/schema`).

## Package

- Types and functions: `@smart-address/core`
- Schemas: `@smart-address/core/schema`

## AddressQuery

```ts
export type AddressQuery = {
  readonly text: string
  readonly limit?: number
  readonly countryCode?: string
  readonly locale?: string
  readonly sessionToken?: string
}
```

### Normalization helpers

```ts
import { addressQueryKey, normalizeAddressQuery } from "@smart-address/core"
```

- `normalizeAddressQuery(query)`: trims strings, normalizes `countryCode`, and sanitizes `limit`.
- `addressQueryKey(query)`: stable cache key (JSON string) for a normalized query.

## AddressSuggestionSource

```ts
export type AddressSuggestionSource = {
  readonly provider: string
  readonly kind?: "public" | "internal"
  readonly reference?: string
}
```

## AddressSuggestion

```ts
export type AddressSuggestion = {
  readonly id: string
  readonly label: string
  readonly address: AddressParts
  readonly score?: number
  readonly source: AddressSuggestionSource
  readonly metadata?: Record<string, string>
}
```

## AddressSuggestionResult

```ts
export type AddressSuggestionResult = {
  readonly suggestions: ReadonlyArray<AddressSuggestion>
  readonly errors: ReadonlyArray<AddressSuggestionError>
}
```

## Errors

```ts
export class AddressProviderError extends Data.TaggedError("AddressProviderError")<{
  readonly provider: string
  readonly message: string
  readonly cause?: unknown
}> {}

export type AddressSuggestionError = {
  readonly provider: string
  readonly message: string
}
```

## AddressProvider

```ts
export interface AddressProvider<R = never> {
  readonly name: string
  readonly suggest: (
    query: AddressQuery
  ) => Effect.Effect<ReadonlyArray<AddressSuggestion>, AddressProviderError, R>
}
```

### Provider helpers

```ts
import { makeAddressProvider, withProviderTimeout } from "@smart-address/core"
```

- `makeAddressProvider(name, suggest)`: wraps unknown errors into `AddressProviderError`.
- `withProviderTimeout(provider, duration)`: fails a provider call with a timeout `AddressProviderError`.

## AddressProviderPlan

```ts
export type AddressProviderStage<R = never> = {
  readonly name?: string
  readonly providers: ReadonlyArray<AddressProvider<R>>
  readonly concurrency?: number | "unbounded"
}

export type AddressProviderPlan<R = never> = {
  readonly stages: ReadonlyArray<AddressProviderStage<R>>
}
```

## AddressSuggestionService

```ts
import { makeAddressSuggestionService } from "@smart-address/core"
```

`makeAddressSuggestionService(planOrProviders)` returns a service with:

- dedupe (by `id`, unless overridden)
- optional stop-at-limit behavior (enabled by default)
- provider errors captured in `errors`
