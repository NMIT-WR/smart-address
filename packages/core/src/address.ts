import { Context, Data, Effect, Layer } from "effect"
import * as Duration from "effect/Duration"

export type AddressQuery = {
  readonly text: string
  readonly limit?: number | undefined
  readonly countryCode?: string | undefined
  readonly locale?: string | undefined
  readonly sessionToken?: string | undefined
}

const normalizeString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

export const normalizeAddressQuery = (query: AddressQuery): AddressQuery => {
  const text = query.text.trim()
  const limit =
    typeof query.limit === "number" && Number.isFinite(query.limit)
      ? Math.max(0, Math.floor(query.limit))
      : undefined
  const countryCode = normalizeString(query.countryCode)?.toUpperCase()
  const locale = normalizeString(query.locale)
  const sessionToken = normalizeString(query.sessionToken)

  return {
    text,
    ...(limit !== undefined ? { limit } : {}),
    ...(countryCode !== undefined ? { countryCode } : {}),
    ...(locale !== undefined ? { locale } : {}),
    ...(sessionToken !== undefined ? { sessionToken } : {})
  }
}

export const addressQueryKey = (query: AddressQuery): string => {
  const normalized = normalizeAddressQuery(query)
  return JSON.stringify([
    normalized.text,
    normalized.limit ?? null,
    normalized.countryCode ?? null,
    normalized.locale ?? null,
    normalized.sessionToken ?? null
  ])
}

export type AddressParts = {
  readonly line1?: string | undefined
  readonly line2?: string | undefined
  readonly city?: string | undefined
  readonly region?: string | undefined
  readonly postalCode?: string | undefined
  readonly countryCode?: string | undefined
}

export type AddressSuggestionSource = {
  readonly provider: string
  readonly kind?: "public" | "internal" | undefined
  readonly reference?: string | undefined
}

export type AddressSuggestion = {
  readonly id: string
  readonly label: string
  readonly address: AddressParts
  readonly score?: number | undefined
  readonly source: AddressSuggestionSource
  readonly metadata?: Record<string, string> | undefined
}

export class AddressProviderError extends Data.TaggedError("AddressProviderError")<{
  readonly provider: string
  readonly message: string
  readonly cause?: unknown
}> {}

export type AddressSuggestionError = {
  readonly provider: string
  readonly message: string
}

export const toSuggestionError = (error: AddressProviderError): AddressSuggestionError => ({
  provider: error.provider,
  message: error.message
})

const isAddressProviderError = (error: unknown): error is AddressProviderError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error as { _tag?: string })._tag === "AddressProviderError"

const messageFromUnknown = (error: unknown): string => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }
  return "Address provider failed"
}

export const normalizeProviderError = (provider: string, error: unknown): AddressProviderError =>
  isAddressProviderError(error)
    ? error
    : new AddressProviderError({
        provider,
        message: messageFromUnknown(error),
        cause: error
      })

export interface AddressProvider<R = never> {
  readonly name: string
  readonly suggest: (
    query: AddressQuery
  ) => Effect.Effect<ReadonlyArray<AddressSuggestion>, AddressProviderError, R>
}

export type AddressProviderStage<R = never> = {
  readonly name?: string
  readonly providers: ReadonlyArray<AddressProvider<R>>
  readonly concurrency?: number | "unbounded"
}

export type AddressProviderPlan<R = never> = {
  readonly stages: ReadonlyArray<AddressProviderStage<R>>
}

export type AddressProviderInput<R = never> = ReadonlyArray<AddressProvider<R>> | AddressProviderPlan<R>

export const makeAddressProvider = <R = never>(
  name: string,
  suggest: (
    query: AddressQuery
  ) => Effect.Effect<ReadonlyArray<AddressSuggestion>, unknown, R>
): AddressProvider<R> => ({
  name,
  suggest: (query) => suggest(query).pipe(Effect.mapError((error) => normalizeProviderError(name, error)))
})

export type AddressSuggestionResult = {
  readonly suggestions: ReadonlyArray<AddressSuggestion>
  readonly errors: ReadonlyArray<AddressSuggestionError>
}

export interface AddressSuggestionService<R = never> {
  readonly suggest: (query: AddressQuery) => Effect.Effect<AddressSuggestionResult, never, R>
}

export const AddressSuggestionService = Context.GenericTag<AddressSuggestionService<unknown>>(
  "AddressSuggestionService"
)

export type AddressSuggestionServiceOptions = {
  readonly dedupeKey?: (suggestion: AddressSuggestion) => string
  readonly stopAtLimit?: boolean
}

const runProvider = <R>(provider: AddressProvider<R>, query: AddressQuery) =>
  provider.suggest(query).pipe(
    Effect.map((suggestions) => ({ suggestions, error: null as AddressProviderError | null })),
    Effect.catchAll((error) =>
      Effect.succeed({ suggestions: [], error: normalizeProviderError(provider.name, error) })
    )
  )

const isPlan = <R>(input: AddressProviderInput<R>): input is AddressProviderPlan<R> =>
  !Array.isArray(input)

const normalizePlan = <R>(input: AddressProviderInput<R>): AddressProviderPlan<R> =>
  isPlan(input) ? input : { stages: [{ providers: input }] }

const appendSuggestions = (
  target: Map<string, AddressSuggestion>,
  suggestions: ReadonlyArray<AddressSuggestion>,
  dedupeKey: (suggestion: AddressSuggestion) => string
) => {
  for (const suggestion of suggestions) {
    const key = dedupeKey(suggestion)
    if (!target.has(key)) {
      target.set(key, suggestion)
    }
  }
}

const applyLimit = (
  suggestions: ReadonlyArray<AddressSuggestion>,
  limit: number | undefined
): ReadonlyArray<AddressSuggestion> =>
  typeof limit === "number" ? suggestions.slice(0, Math.max(0, limit)) : suggestions

export const makeAddressSuggestionService = <R>(
  input: AddressProviderInput<R>,
  options: AddressSuggestionServiceOptions = {}
): AddressSuggestionService<R> => ({
  suggest: (query) =>
    Effect.gen(function* () {
      const plan = normalizePlan(input)
      const limit = query.limit
      const stopAtLimit = options.stopAtLimit ?? true
      const dedupeKey = options.dedupeKey ?? ((suggestion: AddressSuggestion) => suggestion.id)
      const suggestions = new Map<string, AddressSuggestion>()
      const errors: Array<AddressSuggestionError> = []

      if (typeof limit === "number" && limit <= 0) {
        return { suggestions: [], errors: [] }
      }

      for (const stage of plan.stages) {
        const results = yield* Effect.forEach(
          stage.providers,
          (provider) => runProvider(provider, query),
          { concurrency: stage.concurrency ?? "unbounded" }
        )

        for (const result of results) {
          appendSuggestions(suggestions, result.suggestions, dedupeKey)
          if (result.error) {
            errors.push(toSuggestionError(result.error))
          }
        }

        if (stopAtLimit && typeof limit === "number" && suggestions.size >= limit) {
          break
        }
      }

      const orderedSuggestions = Array.from(suggestions.values())

      return {
        suggestions: applyLimit(orderedSuggestions, limit),
        errors
      }
    })
})

export const AddressSuggestionServiceLayer = <R>(
  input: AddressProviderInput<R>,
  options?: AddressSuggestionServiceOptions
) => Layer.succeed(AddressSuggestionService, makeAddressSuggestionService(input, options))

export const withProviderTimeout = <R>(
  provider: AddressProvider<R>,
  duration: Duration.DurationInput
): AddressProvider<R> => ({
  name: provider.name,
  suggest: (query) =>
    provider.suggest(query).pipe(
      Effect.timeoutFail({
        duration,
        onTimeout: () =>
          new AddressProviderError({
            provider: provider.name,
            message: `Timed out after ${Duration.toMillis(duration)}ms`
          })
      })
    )
})
