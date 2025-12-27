# Core typy

Všechny core typy jsou v `@smart-address/core`.

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

## AddressProvider

```ts
export interface AddressProvider<R = never> {
  readonly name: string
  readonly suggest: (
    query: AddressQuery
  ) => Effect.Effect<ReadonlyArray<AddressSuggestion>, AddressProviderError, R>
}
```

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
