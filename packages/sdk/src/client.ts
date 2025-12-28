export type AddressStrategy = "fast" | "reliable"

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

export type AddressSuggestionError = {
  readonly provider: string
  readonly message: string
}

export type AddressSuggestionResult = {
  readonly suggestions: ReadonlyArray<AddressSuggestion>
  readonly errors: ReadonlyArray<AddressSuggestionError>
}

export type SuggestAddressRequest = {
  readonly text: string
  readonly limit?: number | undefined
  readonly countryCode?: string | undefined
  readonly locale?: string | undefined
  readonly sessionToken?: string | undefined
  readonly strategy?: AddressStrategy | undefined
}

export type SuggestAddressOptions = {
  readonly signal?: AbortSignal
}

export type SmartAddressClient = {
  readonly suggest: (
    request: SuggestAddressRequest,
    options?: SuggestAddressOptions
  ) => Promise<AddressSuggestionResult>
}

export type SmartAddressClientConfig = {
  readonly baseUrl: string
  readonly key?: string | undefined
  readonly fetch?: typeof fetch
}

const normalizeOptional = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const normalizeLimit = (value: number | undefined): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined
  }
  return Math.max(0, Math.floor(value))
}

const resolveSuggestUrl = (baseUrl: string): URL => {
  const trimmed = baseUrl.trim()
  const url = new URL(trimmed)
  const path = url.pathname.replace(/\/+$/, "")
  if (path.endsWith("/suggest")) {
    return url
  }
  return new URL("/suggest", url)
}

const resolveFetch = (override?: typeof fetch): typeof fetch => {
  if (override) {
    return override
  }
  if (typeof fetch === "function") {
    return fetch.bind(globalThis)
  }
  throw new Error("Smart Address SDK requires fetch. Provide it in createClient({ fetch }).")
}

const parseErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null)
    if (payload && typeof payload === "object" && "error" in payload) {
      const message = (payload as { error?: unknown }).error
      if (typeof message === "string" && message.length > 0) {
        return message
      }
    }
  }
  return `Request failed (${response.status})`
}

const readResult = async (response: Response): Promise<AddressSuggestionResult> => {
  const payload = await response.json().catch(() => null)
  if (!payload || typeof payload !== "object") {
    return { suggestions: [], errors: [] }
  }
  const typed = payload as Partial<AddressSuggestionResult>
  return {
    suggestions: Array.isArray(typed.suggestions) ? typed.suggestions : [],
    errors: Array.isArray(typed.errors) ? typed.errors : []
  }
}

export const createClient = (config: SmartAddressClientConfig): SmartAddressClient => {
  const baseUrl = resolveSuggestUrl(config.baseUrl)
  const key = normalizeOptional(config.key)
  const fetcher = resolveFetch(config.fetch)

  return {
    suggest: async (request, options) => {
      const text = normalizeOptional(request.text)
      if (!text) {
        throw new Error("Missing required 'text' field.")
      }

      const url = new URL(baseUrl.toString())
      const params = url.searchParams
      params.set("text", text)

      const limit = normalizeLimit(request.limit)
      if (limit !== undefined) {
        params.set("limit", String(limit))
      }

      const countryCode = normalizeOptional(request.countryCode)
      if (countryCode) {
        params.set("countryCode", countryCode.toUpperCase())
      }

      const locale = normalizeOptional(request.locale)
      if (locale) {
        params.set("locale", locale)
      }

      const sessionToken = normalizeOptional(request.sessionToken)
      if (sessionToken) {
        params.set("sessionToken", sessionToken)
      }

      if (request.strategy) {
        params.set("strategy", request.strategy)
      }

      if (key) {
        params.set("key", key)
      }

      const requestInit: RequestInit = {
        headers: {
          accept: "application/json"
        }
      }

      if (options?.signal) {
        requestInit.signal = options.signal
      }

      const response = await fetcher(url.toString(), requestInit)

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response))
      }

      return readResult(response)
    }
  }
}
