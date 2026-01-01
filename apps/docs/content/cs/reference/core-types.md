# Core typy

Všechny core typy jsou v `@smart-address/core` (a schémata jsou v `@smart-address/core/schema`).

## Balíček

- Typy a funkce: `@smart-address/core`
- Schémata: `@smart-address/core/schema`

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

### Normalizace

```ts
import { addressQueryKey, normalizeAddressQuery } from "@smart-address/core"
```

- `normalizeAddressQuery(query)`: trim stringů, normalizace `countryCode` a sanitizace `limit`.
- `addressQueryKey(query)`: stabilní cache key (JSON string) pro normalizovaný dotaz.

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

### Helpery pro providery

```ts
import { makeAddressProvider, withProviderTimeout } from "@smart-address/core"
```

- `makeAddressProvider(name, suggest)`: obalí neznámé chyby do `AddressProviderError`.
- `withProviderTimeout(provider, duration)`: timeout provider volání jako `AddressProviderError`.

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

`makeAddressSuggestionService(planOrProviders)` vrátí službu s:

- deduplikací (default podle `id`, lze přepsat)
- volitelným stop-at-limit chováním (default zapnuto)
- chybami providerů v poli `errors`
