import type {
  AddressParts,
  AddressSuggestion,
  AddressSuggestionError,
  AddressSuggestionResult,
  AddressSuggestionSource,
} from "@smart-address/core";

export type AddressStrategy = "fast" | "reliable";
export type {
  AddressParts,
  AddressSuggestion,
  AddressSuggestionError,
  AddressSuggestionResult,
  AddressSuggestionSource,
} from "@smart-address/core";

export interface SuggestAddressRequest {
  readonly text: string;
  readonly limit?: number | undefined;
  readonly countryCode?: string | undefined;
  readonly locale?: string | undefined;
  readonly sessionToken?: string | undefined;
  readonly strategy?: AddressStrategy | undefined;
}

export interface SuggestAddressOptions {
  readonly signal?: AbortSignal;
}

export interface SmartAddressClient {
  readonly suggest: (
    request: SuggestAddressRequest,
    options?: SuggestAddressOptions
  ) => Promise<AddressSuggestionResult>;
}

export interface SmartAddressClientConfig {
  readonly baseUrl: string;
  readonly key?: string | undefined;
  readonly fetch?: typeof fetch;
}

const normalizeOptional = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeLimit = (value: number | undefined): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.floor(value);
  if (normalized <= 0) {
    return undefined;
  }
  return normalized;
};

const normalizeStrategy = (value: unknown): AddressStrategy | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === "fast" || value === "reliable") {
    return value;
  }
  throw new Error("Invalid strategy. Expected 'fast' or 'reliable'.");
};

const trailingSlashRegex = /\/+$/;

const resolveSuggestUrl = (baseUrl: string): URL => {
  const trimmed = baseUrl.trim();
  const url = new URL(trimmed);
  const path = url.pathname.replace(trailingSlashRegex, "");
  if (path.endsWith("/suggest")) {
    return url;
  }
  return new URL("/suggest", url);
};

const resolveFetch = (override?: typeof fetch): typeof fetch => {
  if (override) {
    return override;
  }
  if (typeof fetch === "function") {
    return fetch.bind(globalThis);
  }
  throw new Error(
    "Smart Address SDK requires fetch. Provide it in createClient({ fetch })."
  );
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object" && "error" in payload) {
      const message = (payload as { error?: unknown }).error;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
  }
  return `Request failed (${response.status})`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasOptionalString = (
  record: Record<string, unknown>,
  key: string
): boolean => {
  if (!(key in record)) {
    return true;
  }
  const value = record[key];
  return value === undefined || typeof value === "string";
};

const isAddressParts = (value: unknown): value is AddressParts => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    hasOptionalString(value, "line1") &&
    hasOptionalString(value, "line2") &&
    hasOptionalString(value, "city") &&
    hasOptionalString(value, "region") &&
    hasOptionalString(value, "postalCode") &&
    hasOptionalString(value, "countryCode")
  );
};

const isSuggestionSource = (
  value: unknown
): value is AddressSuggestionSource => {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.provider !== "string") {
    return false;
  }
  return (
    hasOptionalString(value, "kind") && hasOptionalString(value, "reference")
  );
};

const isAddressSuggestion = (value: unknown): value is AddressSuggestion => {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.id !== "string" || typeof value.label !== "string") {
    return false;
  }
  if (!(isSuggestionSource(value.source) && isAddressParts(value.address))) {
    return false;
  }
  if (
    "score" in value &&
    value.score !== undefined &&
    typeof value.score !== "number"
  ) {
    return false;
  }
  if (
    "metadata" in value &&
    value.metadata !== undefined &&
    !isRecord(value.metadata)
  ) {
    return false;
  }
  return true;
};

const isSuggestionError = (value: unknown): value is AddressSuggestionError => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.provider === "string" && typeof value.message === "string"
  );
};

const readResult = async (
  response: Response
): Promise<AddressSuggestionResult> => {
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return { suggestions: [], errors: [] };
  }
  const typed = payload as Partial<AddressSuggestionResult>;
  return {
    suggestions: Array.isArray(typed.suggestions)
      ? typed.suggestions.filter(isAddressSuggestion)
      : [],
    errors: Array.isArray(typed.errors)
      ? typed.errors.filter(isSuggestionError)
      : [],
  };
};

const buildSuggestUrl = (
  baseUrl: URL,
  request: SuggestAddressRequest,
  key: string | undefined
): URL => {
  const text = normalizeOptional(request.text);
  if (!text) {
    throw new Error("Missing required 'text' field.");
  }

  const url = new URL(baseUrl.toString());
  const params = url.searchParams;
  params.set("text", text);

  const limit = normalizeLimit(request.limit);
  if (limit !== undefined) {
    params.set("limit", String(limit));
  }

  const countryCode = normalizeOptional(request.countryCode);
  if (countryCode) {
    params.set("countryCode", countryCode.toUpperCase());
  }

  const locale = normalizeOptional(request.locale);
  if (locale) {
    params.set("locale", locale);
  }

  const sessionToken = normalizeOptional(request.sessionToken);
  if (sessionToken) {
    params.set("sessionToken", sessionToken);
  }

  const strategy = normalizeStrategy(request.strategy);
  if (strategy) {
    params.set("strategy", strategy);
  }

  if (key) {
    params.set("key", key);
  }

  return url;
};

const buildRequestInit = (
  options: SuggestAddressOptions | undefined
): RequestInit => {
  const requestInit: RequestInit = {
    headers: {
      accept: "application/json",
    },
  };

  if (options?.signal) {
    requestInit.signal = options.signal;
  }

  return requestInit;
};

export const createClient = (
  config: SmartAddressClientConfig
): SmartAddressClient => {
  const baseUrl = resolveSuggestUrl(config.baseUrl);
  const key = normalizeOptional(config.key);
  const fetcher = resolveFetch(config.fetch);

  return {
    suggest: async (request, options) => {
      const url = buildSuggestUrl(baseUrl, request, key);
      const requestInit = buildRequestInit(options);
      const response = await fetcher(url.toString(), requestInit);

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      return readResult(response);
    },
  };
};
