import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import appCss from '../global.css?url'
import { LocaleProvider } from '../i18n'

const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((mod) => ({
        default: mod.TanStackRouterDevtools,
      })),
    )
  : null

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'description',
        content:
          'Smart address suggestions powered by Effect. Reliable, fast, and ready for legacy checkouts.',
      },
      {
        title: 'Smart Address — Instant Suggestions',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body
        className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] bg-fixed [background-image:radial-gradient(circle_at_15%_12%,var(--glow),transparent_45%),radial-gradient(circle_at_82%_18%,var(--glow),transparent_40%),linear-gradient(to_right,var(--grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid)_1px,transparent_1px)] [background-size:100%_100%,100%_100%,36px_36px,36px_36px]"
      >
        <LocaleProvider>{children}</LocaleProvider>
        {RouterDevtools ? (
          <Suspense fallback={null}>
            <RouterDevtools position="bottom-right" />
          </Suspense>
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
