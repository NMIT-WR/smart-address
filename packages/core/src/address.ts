import { Context, Data, Effect, Layer, Option } from "effect";
import { type DurationInput, toMillis } from "effect/Duration";

export type AddressStrategy = "fast" | "reliable";

export interface AddressQuery {
  readonly text: string;
  readonly limit?: number | undefined;
  readonly countryCode?: string | undefined;
  readonly locale?: string | undefined;
  readonly sessionToken?: string | undefined;
}

const normalizeString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const normalizeAddressQuery = (query: AddressQuery): AddressQuery => {
  const text = query.text.trim();
  const limit =
    typeof query.limit === "number" && Number.isFinite(query.limit)
      ? Math.max(0, Math.floor(query.limit))
      : undefined;
  const countryCode = normalizeString(query.countryCode)?.toUpperCase();
  const locale = normalizeString(query.locale);
  const sessionToken = normalizeString(query.sessionToken);

  return {
    text,
    ...(limit !== undefined ? { limit } : {}),
    ...(countryCode !== undefined ? { countryCode } : {}),
    ...(locale !== undefined ? { locale } : {}),
    ...(sessionToken !== undefined ? { sessionToken } : {}),
  };
};

export const addressQueryKey = (query: AddressQuery): string => {
  const normalized = normalizeAddressQuery(query);
  return JSON.stringify([
    normalized.text,
    normalized.limit ?? null,
    normalized.countryCode ?? null,
    normalized.locale ?? null,
    normalized.sessionToken ?? null,
  ]);
};

export interface AddressParts {
  readonly line1?: string | undefined;
  readonly line2?: string | undefined;
  readonly city?: string | undefined;
  readonly region?: string | undefined;
  readonly postalCode?: string | undefined;
  readonly countryCode?: string | undefined;
}

export interface AddressSuggestionSource {
  readonly provider: string;
  readonly kind?: "public" | "internal" | undefined;
  readonly reference?: string | undefined;
}

export interface AddressSuggestion {
  readonly id: string;
  readonly label: string;
  readonly address: AddressParts;
  readonly score?: number | undefined;
  readonly source: AddressSuggestionSource;
  readonly metadata?: Record<string, string> | undefined;
}

export class AddressProviderError extends Data.TaggedError(
  "AddressProviderError"
)<{
  readonly provider: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

export interface AddressSuggestionError {
  readonly provider: string;
  readonly message: string;
}

export const toSuggestionError = (
  error: AddressProviderError
): AddressSuggestionError => ({
  provider: error.provider,
  message: error.message,
});

const isAddressProviderError = (
  error: unknown
): error is AddressProviderError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error as { _tag?: string })._tag === "AddressProviderError";

const messageFromUnknown = (error: unknown): string => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "Address provider failed";
};

export const normalizeProviderError = (
  provider: string,
  error: unknown
): AddressProviderError =>
  isAddressProviderError(error)
    ? error
    : new AddressProviderError({
        provider,
        message: messageFromUnknown(error),
        cause: error,
      });

export interface AddressProvider<R = never> {
  readonly name: string;
  readonly suggest: (
    query: AddressQuery
  ) => Effect.Effect<readonly AddressSuggestion[], AddressProviderError, R>;
}

export interface AddressProviderStage<R = never> {
  readonly name?: string;
  readonly providers: readonly AddressProvider<R>[];
  readonly concurrency?: number | "unbounded";
}

export interface AddressProviderPlan<R = never> {
  readonly stages: readonly AddressProviderStage<R>[];
}

export type AddressProviderInput<R = never> =
  | readonly AddressProvider<R>[]
  | AddressProviderPlan<R>;

export const makeAddressProvider = <R = never>(
  name: string,
  suggest: (
    query: AddressQuery
  ) => Effect.Effect<readonly AddressSuggestion[], unknown, R>
): AddressProvider<R> => ({
  name,
  suggest: (query) =>
    suggest(query).pipe(
      Effect.mapError((error) => normalizeProviderError(name, error))
    ),
});

export interface AddressSuggestionResult {
  readonly suggestions: readonly AddressSuggestion[];
  readonly errors: readonly AddressSuggestionError[];
}

export interface AddressSuggestionService<R = never> {
  readonly suggest: (
    query: AddressQuery
  ) => Effect.Effect<AddressSuggestionResult, never, R>;
}

export const AddressSuggestionService = Context.GenericTag<
  AddressSuggestionService<unknown>
>("AddressSuggestionService");

export interface AddressSuggestionServiceOptions {
  readonly dedupeKey?: (suggestion: AddressSuggestion) => string;
  readonly stopAtLimit?: boolean;
}

const readProviderKind = (provider: AddressProvider<unknown>): string => {
  const candidate = (provider as { kind?: string }).kind;
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : "unknown";
};

const errorTypeFromProviderError = (error: AddressProviderError): string => {
  if (error.cause instanceof Error && error.cause.name.length > 0) {
    return error.cause.name;
  }
  return error._tag ?? "AddressProviderError";
};

const recordProviderError = (
  provider: AddressProvider<unknown>,
  error: AddressProviderError
) => {
  const providerKind = readProviderKind(provider);
  const errorType = errorTypeFromProviderError(error);
  const errorMessage = error.message;

  return Effect.gen(function* () {
    yield* Effect.annotateCurrentSpan({
      "provider.name": provider.name,
      "provider.kind": providerKind,
      "provider.error": true,
      "provider.error_type": errorType,
      "provider.error_message": errorMessage,
    });

    const maybeSpan = yield* Effect.option(Effect.currentSpan);
    yield* Option.match(maybeSpan, {
      onNone: () => Effect.void,
      onSome: (span) =>
        Effect.sync(() => {
          const timestampNs = BigInt(Date.now()) * 1_000_000n;
          span.event("exception", timestampNs, {
            "exception.type": errorType,
            "exception.message": errorMessage,
          });
        }),
    });
  }).pipe(Effect.catchAll(() => Effect.void));
};

const runProvider = <R>(provider: AddressProvider<R>, query: AddressQuery) =>
  provider.suggest(query).pipe(
    Effect.mapError((error) => normalizeProviderError(provider.name, error)),
    Effect.tapError((error) => recordProviderError(provider, error)),
    Effect.map((suggestions) => ({
      suggestions,
      error: null as AddressProviderError | null,
    })),
    Effect.withSpan("address.provider", {
      kind: "client",
      attributes: {
        "provider.name": provider.name,
        "provider.kind": readProviderKind(provider),
      },
    }),
    Effect.catchAll((error) =>
      Effect.succeed({
        suggestions: [],
        error,
      })
    )
  );

const isPlan = <R>(
  input: AddressProviderInput<R>
): input is AddressProviderPlan<R> => !Array.isArray(input);

const normalizePlan = <R>(
  input: AddressProviderInput<R>
): AddressProviderPlan<R> =>
  isPlan(input) ? input : { stages: [{ providers: input }] };

const appendSuggestions = (
  target: Map<string, AddressSuggestion>,
  suggestions: readonly AddressSuggestion[],
  dedupeKey: (suggestion: AddressSuggestion) => string
) => {
  for (const suggestion of suggestions) {
    const key = dedupeKey(suggestion);
    if (!target.has(key)) {
      target.set(key, suggestion);
    }
  }
};

const applyLimit = (
  suggestions: readonly AddressSuggestion[],
  limit: number | undefined
): readonly AddressSuggestion[] =>
  typeof limit === "number"
    ? suggestions.slice(0, Math.max(0, limit))
    : suggestions;

const isLimitReached = (
  limit: number | undefined,
  size: number,
  stopAtLimit: boolean
): boolean => stopAtLimit && typeof limit === "number" && size >= limit;

const shouldReturnEmpty = (limit: number | undefined): boolean =>
  typeof limit === "number" && limit <= 0;

const collectStageResults = <R>(
  stage: AddressProviderStage<R>,
  query: AddressQuery,
  dedupeKey: (suggestion: AddressSuggestion) => string,
  suggestions: Map<string, AddressSuggestion>,
  errors: AddressSuggestionError[]
) =>
  Effect.gen(function* () {
    const results = yield* Effect.forEach(
      stage.providers,
      (provider) => runProvider(provider, query),
      { concurrency: stage.concurrency ?? "unbounded" }
    );

    for (const result of results) {
      appendSuggestions(suggestions, result.suggestions, dedupeKey);
      if (result.error) {
        errors.push(toSuggestionError(result.error));
      }
    }
  }).pipe(
    Effect.withSpan("address.stage", {
      kind: "internal",
      attributes: {
        ...(stage.name ? { "address.stage.name": stage.name } : {}),
        "address.stage.concurrency": stage.concurrency ?? "unbounded",
        "address.stage.providers": stage.providers.map(
          (provider) => provider.name
        ),
      },
    })
  );

const runPlan = <R>(
  plan: AddressProviderPlan<R>,
  query: AddressQuery,
  stopAtLimit: boolean,
  dedupeKey: (suggestion: AddressSuggestion) => string
): Effect.Effect<AddressSuggestionResult, never, R> =>
  Effect.gen(function* () {
    const limit = query.limit;
    if (shouldReturnEmpty(limit)) {
      return { suggestions: [], errors: [] };
    }

    const suggestions = new Map<string, AddressSuggestion>();
    const errors: AddressSuggestionError[] = [];

    for (const stage of plan.stages) {
      yield* collectStageResults(stage, query, dedupeKey, suggestions, errors);
      if (isLimitReached(limit, suggestions.size, stopAtLimit)) {
        break;
      }
    }

    return {
      suggestions: applyLimit(Array.from(suggestions.values()), limit),
      errors,
    };
  }).pipe(
    Effect.withSpan("address.plan", {
      kind: "internal",
      attributes: {
        "address.plan.stages": plan.stages.length,
        ...(query.limit === undefined
          ? {}
          : { "address.query.limit": query.limit }),
      },
    })
  );

export const makeAddressSuggestionService = <R>(
  input: AddressProviderInput<R>,
  options: AddressSuggestionServiceOptions = {}
): AddressSuggestionService<R> => ({
  suggest: (query) =>
    runPlan(
      normalizePlan(input),
      query,
      options.stopAtLimit ?? true,
      options.dedupeKey ?? ((suggestion: AddressSuggestion) => suggestion.id)
    ),
});

export const AddressSuggestionServiceLayer = <R>(
  input: AddressProviderInput<R>,
  options?: AddressSuggestionServiceOptions
) =>
  Layer.succeed(
    AddressSuggestionService,
    makeAddressSuggestionService(input, options)
  );

export const withProviderTimeout = <R>(
  provider: AddressProvider<R>,
  duration: DurationInput
): AddressProvider<R> => ({
  name: provider.name,
  suggest: (query) =>
    provider.suggest(query).pipe(
      Effect.timeoutFail({
        duration,
        onTimeout: () =>
          new AddressProviderError({
            provider: provider.name,
            message: `Timed out after ${toMillis(duration)}ms`,
          }),
      })
    ),
});
