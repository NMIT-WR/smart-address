import { createFileRoute } from '@tanstack/react-router'
import { createClient, type AddressSuggestion } from '@smart-address/sdk'
import { useLocaleContext } from 'fbtee'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { availableLanguages } from '../i18n'

export const Route = createFileRoute('/')({ component: Landing })

type Suggestion = AddressSuggestion

const demoEndpoint =
  import.meta.env.VITE_SUGGEST_URL ?? 'http://localhost:8787/suggest'
const demoClient = createClient({
  baseUrl: demoEndpoint,
  key: import.meta.env.VITE_SUGGEST_KEY,
})

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

const useSuggestions = (query: string) => {
  const [results, setResults] = useState<ReadonlyArray<Suggestion>>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>(
    'idle',
  )
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setStatus('idle')
      setHasError(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        setStatus('loading')
        setHasError(false)
        const payload = await demoClient.suggest(
          {
            text: trimmed,
            limit: 5,
            strategy: 'reliable',
          },
          { signal: controller.signal },
        )
        setResults(payload.suggestions)
        setStatus('ready')
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') {
          return
        }
        setResults([])
        setStatus('error')
        setHasError(true)
      }
    }, 320)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { results, status, hasError }
}

const LocaleToggle = () => {
  const { locale, setLocale } = useLocaleContext()
  const [, startTransition] = useTransition()
  const nextLocale = locale === 'cs_CZ' ? 'en_US' : 'cs_CZ'

  return (
    <button
      className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-quiet)] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
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
  const { results, status, hasError } = useSuggestions(query)
  const serviceStatusLabel = hasError ? (
    <fbt desc="Service status">Service offline</fbt>
  ) : status === 'loading' ? (
    <fbt desc="Service status">Service checking</fbt>
  ) : status === 'ready' ? (
    <fbt desc="Service status">Service online</fbt>
  ) : (
    <fbt desc="Service status">Service idle</fbt>
  )

  const features = useMemo(
    () => [
      {
        id: 'ladder',
        title: <fbt desc="Feature title">Provider ladder</fbt>,
        description: (
          <fbt desc="Feature description">
            Start with the cheapest provider, escalate only when needed.
          </fbt>
        ),
      },
      {
        id: 'legacy',
        title: <fbt desc="Feature title">Legacy ready</fbt>,
        description: (
          <fbt desc="Feature description">
            One request shape across GET, POST, RPC, and MCP tool calls.
          </fbt>
        ),
      },
      {
        id: 'cache',
        title: <fbt desc="Feature title">Cache with intent</fbt>,
        description: (
          <fbt desc="Feature description">
            L1 dedupe, L2 persistence, and SWR keep results fresh and cheap.
          </fbt>
        ),
      },
    ],
    [],
  )

  return (
    <div className="px-6 pb-24 pt-10">
      <header className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] shadow-[0_12px_30px_var(--shadow)]">
            SA
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              <fbt desc="Brand kicker">Smart Address</fbt>
            </span>
            <span className="text-sm text-[color:var(--muted)]">
              <fbt desc="Brand subline">Effect-native address intelligence</fbt>
            </span>
          </div>
        </div>
        <LocaleToggle />
      </header>

      <main className="mx-auto mt-12 flex max-w-6xl flex-col gap-16">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="flex flex-col gap-6">
            <h1 className="opacity-0 translate-y-3 text-4xl font-[var(--font-display)] leading-[1.05] tracking-[-0.03em] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none animate-[fade-in_0.7s_ease-out_0.04s_forwards] sm:text-5xl lg:text-6xl">
              <fbt desc="Hero headline">
                Address suggestions your checkout can trust.
              </fbt>
            </h1>
            <p className="opacity-0 translate-y-3 text-lg text-[color:var(--muted)] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none animate-[fade-in_0.7s_ease-out_0.12s_forwards]">
              <fbt desc="Hero subheading">
                Framework-agnostic core in Effect. A tiny Bun service orchestrates
                providers, caches, and rate limits.
              </fbt>
            </p>
            <div className="opacity-0 translate-y-3 flex flex-wrap gap-3 motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none animate-[fade-in_0.7s_ease-out_0.2s_forwards]">
              <a
                className="rounded-full border border-[color:var(--accent-strong)] bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-[color:var(--panel)] shadow-[0_18px_40px_var(--glow)] transition hover:scale-[1.01]"
                href="#demo"
              >
                <fbt desc="Primary CTA">Try the live demo</fbt>
              </a>
            </div>
            <div className="opacity-0 translate-y-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em] text-[color:var(--muted)] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none animate-[fade-in_0.7s_ease-out_0.28s_forwards]">
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-quiet)] px-3 py-1">
                <fbt desc="Mode chip">fast mode</fbt>
              </span>
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-quiet)] px-3 py-1">
                <fbt desc="Mode chip">reliable mode</fbt>
              </span>
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-quiet)] px-3 py-1">
                <fbt desc="Mode chip">reliable + fast (planned)</fbt>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="opacity-0 translate-y-3 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-[0_24px_60px_var(--shadow)] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none animate-[fade-in_0.7s_ease-out_0.14s_forwards]">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                <span>
                  <fbt desc="Signal label">Reliability signals</fbt>
                </span>
                <span>
                  <fbt desc="Rate limit badge">1 req/s for Nominatim</fbt>
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-soft)] p-4">
                  <div className="text-2xl font-semibold text-[color:var(--text)]">
                    L1 + L2
                  </div>
                  <p className="text-sm text-[color:var(--muted)]">
                    <fbt desc="Metric label">Cache-first responses</fbt>
                  </p>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-soft)] p-4">
                  <div className="text-2xl font-semibold text-[color:var(--text)]">
                    SWR
                  </div>
                  <p className="text-sm text-[color:var(--muted)]">
                    <fbt desc="Metric label">Background revalidation</fbt>
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-[color:var(--muted)]">
                <fbt desc="Panel note">
                  Start cheap, then escalate to trusted sources when confidence
                  drops.
                </fbt>
              </p>
            </div>

            <div className="opacity-0 translate-y-3 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel-soft)] p-5 motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none animate-[fade-in_0.7s_ease-out_0.22s_forwards]">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                <span>
                  <fbt desc="Interfaces label">Interfaces</fbt>
                </span>
                <span>
                  <fbt desc="Interfaces value">HTTP · RPC · MCP</fbt>
                </span>
              </div>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                <fbt desc="Interfaces blurb">
                  One payload across GET, POST, Effect RPC, and MCP tool calls.
                </fbt>
              </p>
            </div>
          </div>
        </section>

        <section
          id="demo"
          className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-[0_24px_60px_var(--shadow)] md:p-8"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-[var(--font-display)] tracking-[-0.02em]">
                <fbt desc="Demo headline">Live address demo</fbt>
              </h2>
              <p className="text-sm text-[color:var(--muted)]">
                <fbt desc="Demo subtitle">
                  Live results powered by Smart Address.
                </fbt>
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                <fbt desc="Input label">Search address</fbt>
              </label>
              <input
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-soft)] px-4 py-3 text-lg text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--glow)]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Praha 1, Na Poříčí"
                value={query}
              />
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-soft)] p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                <span>
                  <fbt desc="Results label">Suggestions</fbt>
                </span>
                <span>
                  {serviceStatusLabel}
                </span>
              </div>
              {hasError ? (
                <p className="mt-3 text-sm text-[color:var(--accent)]">
                  <fbt desc="Backend error">
                    Service unavailable. Try again shortly.
                  </fbt>
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
                      {suggestion.source?.provider ? (
                        <span className="text-xs uppercase tracking-[0.15em] text-[color:var(--muted)]">
                          <fbt desc="Suggestion source label">
                            via{' '}
                            <fbt:param name="provider">
                              {suggestion.source.provider}
                            </fbt:param>
                          </fbt>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_40px_var(--shadow)]"
            >
              <h3 className="text-lg font-[var(--font-display)]">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-soft)] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-[var(--font-display)]">
                <fbt desc="Integration headline">Legacy friendly by design</fbt>
              </h3>
              <p className="text-sm text-[color:var(--muted)]">
                <fbt desc="Integration blurb">
                  Plug into a PHP checkout, a single-page app, or a headless
                  storefront in minutes.
                </fbt>
              </p>
            </div>
            <pre className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-3 text-xs text-[color:var(--muted)]">
              <code>
                {`GET /suggest?text=Praha&limit=5&strategy=reliable`}
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
