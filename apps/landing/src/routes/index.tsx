import { createFileRoute } from '@tanstack/react-router'
import { useLocaleContext } from 'fbtee'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { availableLanguages } from '../i18n'

export const Route = createFileRoute('/')({ component: Landing })

type Suggestion = {
  readonly id: string
  readonly label: string
  readonly address?: {
    readonly line1?: string
    readonly line2?: string
    readonly city?: string
    readonly region?: string
    readonly postalCode?: string
    readonly countryCode?: string
  }
  readonly source?: {
    readonly provider?: string
  }
}

type SuggestionResult = {
  readonly suggestions?: ReadonlyArray<Suggestion>
}

const demoEndpoint =
  import.meta.env.VITE_SUGGEST_URL ?? 'http://localhost:8787/suggest'

const formatAddress = (suggestion: Suggestion) => {
  const address = suggestion.address ?? {}
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postalCode,
    address.countryCode,
  ].filter(Boolean)
  return parts.join(', ')
}

const formatSource = (suggestion: Suggestion) =>
  suggestion.source?.provider ? `via ${suggestion.source.provider}` : ''

const useSuggestions = (query: string) => {
  const [results, setResults] = useState<ReadonlyArray<Suggestion>>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setStatus('idle')
      setError(null)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        setStatus('loading')
        setError(null)
        const url = new URL(demoEndpoint)
        url.searchParams.set('text', trimmed)
        url.searchParams.set('limit', '5')
        url.searchParams.set('strategy', 'reliable')
        const response = await fetch(url.toString(), {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Request failed')
        }
        const payload = (await response.json()) as SuggestionResult
        setResults(payload.suggestions ?? [])
        setStatus('ready')
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') {
          return
        }
        setResults([])
        setStatus('error')
        setError('Backend unavailable. Start the service on :8787.')
      }
    }, 320)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { results, status, error }
}

const LocaleToggle = () => {
  const { locale, setLocale } = useLocaleContext()
  const [, startTransition] = useTransition()
  const nextLocale = locale === 'cs_CZ' ? 'en_US' : 'cs_CZ'

  return (
    <button
      className="chip flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition hover:text-[color:var(--text)]"
      onClick={() => startTransition(() => setLocale(nextLocale))}
      type="button"
    >
      <span>
        <fbt desc="Language toggle label">Language</fbt>
      </span>
      <span className="text-[color:var(--text)]">
        {availableLanguages.get(nextLocale)}
      </span>
    </button>
  )
}

function Landing() {
  const [query, setQuery] = useState('Praha 1')
  const { results, status, error } = useSuggestions(query)

  const features = useMemo(
    () => [
      {
        id: 'staging',
        title: <fbt desc="Feature title">Provider staging</fbt>,
        description: (
          <fbt desc="Feature description">
            Start fast and cheap, then escalate to trusted sources only when
            needed.
          </fbt>
        ),
      },
      {
        id: 'legacy',
        title: <fbt desc="Feature title">Legacy ready</fbt>,
        description: (
          <fbt desc="Feature description">
            Simple GET/POST endpoint and SDK hooks for modern frameworks.
          </fbt>
        ),
      },
      {
        id: 'cache',
        title: <fbt desc="Feature title">Cache with intent</fbt>,
        description: (
          <fbt desc="Feature description">
            L1 dedupe, L2 persistence, and SWR so repeat lookups stay cheap.
          </fbt>
        ),
      },
    ],
    [],
  )

  return (
    <div className="px-6 pb-24 pt-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex flex-col gap-2">
          <span className="chip w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.3em]">
            <fbt desc="Eyebrow label">Smart Address</fbt>
          </span>
          <h1 className="text-4xl md:text-6xl">
            <fbt desc="Hero headline">
              Address suggestions that feel instant.
            </fbt>
          </h1>
        </div>
        <LocaleToggle />
      </header>

      <main className="mx-auto mt-12 flex max-w-6xl flex-col gap-12">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <p className="text-lg text-[color:var(--muted)]">
              <fbt desc="Hero subheading">
                Effect-first core, tiny Bun service, and a frontend SDK for any
                stack. Reliable, fast, or both.
              </fbt>
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                className="surface accent-ring rounded-full px-5 py-3 text-sm font-semibold text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)]"
                href="#demo"
              >
                <fbt desc="Primary CTA">Run the demo</fbt>
              </a>
              <a
                className="surface-soft rounded-full px-5 py-3 text-sm font-semibold text-[color:var(--text)] transition hover:text-[color:var(--accent)]"
                href="http://localhost:8787/health"
              >
                <fbt desc="Secondary CTA">Service health</fbt>
              </a>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-[color:var(--muted)]">
              <span className="chip rounded-full px-3 py-1">
                <fbt desc="Mode chip">fast mode</fbt>
              </span>
              <span className="chip rounded-full px-3 py-1">
                <fbt desc="Mode chip">reliable mode</fbt>
              </span>
              <span className="chip rounded-full px-3 py-1">
                <fbt desc="Mode chip">reliable-fast (planned)</fbt>
              </span>
            </div>
          </div>

          <div className="surface rounded-3xl p-6 md:p-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                <span>
                  <fbt desc="Panel label">Why it sticks</fbt>
                </span>
                <span>1 req/s</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="surface-soft rounded-2xl p-4">
                  <div className="text-2xl font-semibold text-[color:var(--text)]">
                    <fbt desc="Metric value">85%</fbt>
                  </div>
                  <p className="text-sm text-[color:var(--muted)]">
                    <fbt desc="Metric label">
                      Fewer corrections on checkout
                    </fbt>
                  </p>
                </div>
                <div className="surface-soft rounded-2xl p-4">
                  <div className="text-2xl font-semibold text-[color:var(--text)]">
                    <fbt desc="Metric value">&lt;250ms</fbt>
                  </div>
                  <p className="text-sm text-[color:var(--muted)]">
                    <fbt desc="Metric label">
                      Typical response with cache
                    </fbt>
                  </p>
                </div>
              </div>
              <p className="text-sm text-[color:var(--muted)]">
                <fbt desc="Panel note">
                  Ship the core library to any app. Host the service when you
                  need reliable aggregation.
                </fbt>
              </p>
            </div>
          </div>
        </section>

        <section id="demo" className="surface rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl">
                <fbt desc="Demo headline">Live address demo</fbt>
              </h2>
              <p className="text-sm text-[color:var(--muted)]">
                <fbt desc="Demo subtitle">
                  This hits your local service at localhost:8787/suggest.
                </fbt>
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                <fbt desc="Input label">Search address</fbt>
              </label>
              <input
                className="surface-soft rounded-2xl border border-[color:var(--border)] px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--glow)]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Praha 1, Na Porici"
                value={query}
              />
            </div>
            <div className="surface-soft rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                <span>
                  <fbt desc="Results label">Suggestions</fbt>
                </span>
                <span>
                  {status === 'loading' ? (
                    <fbt desc="Loading status">Loading</fbt>
                  ) : (
                    <fbt desc="Ready status">Ready</fbt>
                  )}
                </span>
              </div>
              {error ? (
                <p className="mt-3 text-sm text-[color:var(--accent)]">
                  {error}
                </p>
              ) : results.length === 0 ? (
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  <fbt desc="Empty state">
                    Type a street, city, or postal code to see results.
                  </fbt>
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {results.map((suggestion) => (
                    <li
                      key={suggestion.id}
                      className="flex flex-col gap-1 border-b border-[color:var(--border)] pb-3 last:border-b-0"
                    >
                      <span className="text-base font-semibold text-[color:var(--text)]">
                        {suggestion.label}
                      </span>
                      <span className="text-sm text-[color:var(--muted)]">
                        {formatAddress(suggestion)}
                      </span>
                      <span className="text-xs uppercase tracking-[0.15em] text-[color:var(--muted)]">
                        {formatSource(suggestion)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.id} className="surface rounded-2xl p-5">
              <h3 className="text-lg">{feature.title}</h3>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        <section className="surface-soft rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl">
                <fbt desc="Integration headline">Legacy friendly by design</fbt>
              </h3>
              <p className="text-sm text-[color:var(--muted)]">
                <fbt desc="Integration blurb">
                  Plug into a PHP checkout, a single-page app, or a headless
                  storefront in minutes.
                </fbt>
              </p>
            </div>
            <pre className="surface rounded-2xl px-4 py-3 text-xs text-[color:var(--muted)]">
              <code>
                {`GET ${demoEndpoint}?text=Praha&limit=5&strategy=reliable`}
              </code>
            </pre>
          </div>
        </section>
      </main>

      <footer className="mx-auto mt-16 flex max-w-6xl flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
        <span>
          <fbt desc="Footer line">Smart Address Suggestions</fbt>
        </span>
        <span>
          <fbt desc="Footer line">Effect powered. Provider agnostic.</fbt>
        </span>
      </footer>
    </div>
  )
}
