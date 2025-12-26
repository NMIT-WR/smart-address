import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '../global.css?url'
import { LocaleProvider } from '../i18n'

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
          'Smart address suggestions powered by Effect. Reliable, fast, and legacy friendly.',
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
      <body className="page-shell">
        <LocaleProvider>{children}</LocaleProvider>
        <Scripts />
      </body>
    </html>
  )
}
