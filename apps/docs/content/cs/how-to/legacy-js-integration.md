# Integrace legacy checkoutu (Bootstrap + vanilla JS)

## Cíl

Přidejte našeptávání adres do legacy checkoutu pomocí Smart Address SDK bez bundleru.

## Předpoklady

- Base URL Smart Address služby (například `https://api.example.com`).
- API klíč pro `?key=`.
- Bootstrap 5 CSS (volitelné, použito v ukázce).
- Prohlížeč s `fetch` a `AbortController`.

## Vstupy

- Konfigurace SDK: `baseUrl`, `key` (posílá se jako `?key=`).
- Request pro suggest: `text` (povinné), `limit`, `countryCode`, `locale`, `sessionToken`, `strategy`.
- Request pro accept: `text` (povinné), `suggestion` (povinné), `resultIndex`, `resultCount`, `strategy`.

## Steps

### 0) Živá ukázka (iframe + zdroj)

Ukázka se servíruje z backendu na `/demo/legacy`. Defaultně používá aktuální origin a klíč `docs-demo`.

```tsx preview
import React from "react"

const demoUrl = "/demo/legacy?key=docs-demo"

const htmlSnippet = String.raw`<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
  </head>
  <body class="bg-light">
    <div class="container py-4">
      <label for="address-input" class="form-label">Doručovací adresa</label>
      <div class="position-relative">
        <input
          id="address-input"
          class="form-control"
          autocomplete="off"
          placeholder="Začněte psát adresu"
        />
        <div
          id="address-results"
          class="list-group position-absolute w-100 d-none"
          style="z-index: 1000"
        ></div>
      </div>
    </div>

    <script type="module">
      import { createClient } from "/demo/sdk.js"

      const params = new URLSearchParams(window.location.search)
      const baseUrl = params.get("baseUrl") || window.location.origin
      const key = params.get("key") || "docs-demo"
      const client = createClient({ baseUrl, key })

      const input = document.getElementById("address-input")
      const results = document.getElementById("address-results")

      let items = []
      let activeIndex = -1
      let controller
      let debounceId

      const clearResults = () => {
        results.innerHTML = ""
        results.classList.add("d-none")
        items = []
        activeIndex = -1
      }

      const renderResults = (suggestions) => {
        results.innerHTML = ""
        items = suggestions
        activeIndex = -1

        if (!suggestions.length) {
          results.classList.add("d-none")
          return
        }

        suggestions.forEach((suggestion, index) => {
          const item = document.createElement("button")
          item.type = "button"
          item.className = "list-group-item list-group-item-action"
          item.textContent = suggestion.label
          item.addEventListener("click", () => selectSuggestion(suggestion, index))
          results.appendChild(item)
        })

        results.classList.remove("d-none")
      }

      const updateActive = () => {
        const buttons = results.querySelectorAll("button")
        buttons.forEach((button, index) => {
          if (index === activeIndex) {
            button.classList.add("active")
          } else {
            button.classList.remove("active")
          }
        })
      }

      const moveActive = (delta) => {
        if (!items.length) {
          return
        }
        activeIndex = (activeIndex + delta + items.length) % items.length
        updateActive()
      }

      const selectSuggestion = (suggestion, index) => {
        const text = input.value.trim()
        input.value = suggestion.label
        clearResults()
        client
          .accept({
            text: text || suggestion.label,
            strategy: "reliable",
            suggestion,
            resultIndex: index,
            resultCount: items.length
          })
          .catch((error) => {
            console.warn("Smart Address accept failed", error)
          })
      }

      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault()
          moveActive(1)
        } else if (event.key === "ArrowUp") {
          event.preventDefault()
          moveActive(-1)
        } else if (event.key === "Enter" && activeIndex >= 0) {
          event.preventDefault()
          selectSuggestion(items[activeIndex], activeIndex)
        } else if (event.key === "Escape") {
          clearResults()
        }
      })

      input.addEventListener("input", () => {
        const value = input.value.trim()
        clearTimeout(debounceId)

        if (controller) {
          controller.abort()
        }

        if (!value) {
          clearResults()
          return
        }

        controller = new AbortController()
        debounceId = setTimeout(async () => {
          try {
            const result = await client.suggest(
              {
                text: value,
                limit: 5,
                countryCode: "CZ",
                strategy: "reliable"
              },
              { signal: controller.signal }
            )
            renderResults(result.suggestions)
          } catch (error) {
            if (error && error.name === "AbortError") {
              return
            }
            console.warn("Smart Address failed", error)
            clearResults()
          }
        }, 250)
      })
    </script>
  </body>
</html>`

export default function LegacyDemoPreview() {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        alignItems: "start"
      }}
    >
      <iframe
        src={demoUrl}
        title="Smart Address legacy demo"
        style={{ width: "100%", height: 520, border: "1px solid #dee2e6", borderRadius: 12 }}
      />
      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 12,
          background: "#0f172a",
          color: "#e2e8f0",
          overflow: "auto",
          fontSize: 12,
          lineHeight: 1.4
        }}
      >
        <code>{htmlSnippet}</code>
      </pre>
    </div>
  )
}
```

### 1) Plný HTML zdroj (volitelné)

```html
<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <title>Smart Address legacy checkout</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
    />
  </head>
  <body class="bg-light">
    <div class="container py-4">
      <label for="address-input" class="form-label">Doručovací adresa</label>
      <div class="position-relative">
        <input
          id="address-input"
          class="form-control"
          autocomplete="off"
          placeholder="Začněte psát adresu"
        />
        <div
          id="address-results"
          class="list-group position-absolute w-100 d-none"
          style="z-index: 1000"
        ></div>
      </div>
    </div>

    <script type="module">
      import { createClient } from "/demo/sdk.js"

      const params = new URLSearchParams(window.location.search)
      const baseUrl = params.get("baseUrl") || window.location.origin
      const key = params.get("key") || "docs-demo"
      const client = createClient({ baseUrl, key })

      const input = document.getElementById("address-input")
      const results = document.getElementById("address-results")

      let items = []
      let activeIndex = -1
      let controller
      let debounceId

      const clearResults = () => {
        results.innerHTML = ""
        results.classList.add("d-none")
        items = []
        activeIndex = -1
      }

      const renderResults = (suggestions) => {
        results.innerHTML = ""
        items = suggestions
        activeIndex = -1

        if (!suggestions.length) {
          results.classList.add("d-none")
          return
        }

        suggestions.forEach((suggestion, index) => {
          const item = document.createElement("button")
          item.type = "button"
          item.className = "list-group-item list-group-item-action"
          item.textContent = suggestion.label
          item.addEventListener("click", () => selectSuggestion(suggestion, index))
          results.appendChild(item)
        })

        results.classList.remove("d-none")
      }

      const updateActive = () => {
        const buttons = results.querySelectorAll("button")
        buttons.forEach((button, index) => {
          if (index === activeIndex) {
            button.classList.add("active")
          } else {
            button.classList.remove("active")
          }
        })
      }

      const moveActive = (delta) => {
        if (!items.length) {
          return
        }
        activeIndex = (activeIndex + delta + items.length) % items.length
        updateActive()
      }

      const selectSuggestion = (suggestion, index) => {
        const text = input.value.trim()
        input.value = suggestion.label
        clearResults()
        client
          .accept({
            text: text || suggestion.label,
            strategy: "reliable",
            suggestion,
            resultIndex: index,
            resultCount: items.length
          })
          .catch((error) => {
            console.warn("Smart Address accept failed", error)
          })
      }

      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault()
          moveActive(1)
        } else if (event.key === "ArrowUp") {
          event.preventDefault()
          moveActive(-1)
        } else if (event.key === "Enter" && activeIndex >= 0) {
          event.preventDefault()
          selectSuggestion(items[activeIndex], activeIndex)
        } else if (event.key === "Escape") {
          clearResults()
        }
      })

      input.addEventListener("input", () => {
        const value = input.value.trim()
        clearTimeout(debounceId)

        if (controller) {
          controller.abort()
        }

        if (!value) {
          clearResults()
          return
        }

        controller = new AbortController()
        debounceId = setTimeout(async () => {
          try {
            const result = await client.suggest(
              {
                text: value,
                limit: 5,
                countryCode: "CZ",
                strategy: "reliable"
              },
              { signal: controller.signal }
            )
            renderResults(result.suggestions)
          } catch (error) {
            if (error && error.name === "AbortError") {
              return
            }
            console.warn("Smart Address failed", error)
            clearResults()
          }
        }, 250)
      })
    </script>
  </body>
</html>
```

## Výstup

- Návrhy se zobrazí pod inputem.
- Výběr návrhu vyplní input.

## Chyby

- Síťové chyby nebo 4xx/5xx odpovědi vyhodí chybu.
- Neplatný payload vrací `400` s `{ "error": "..." }`.
- Zrušené requesty vyhodí `AbortError`.

## Viz také

- [Klienti a SDK](/cs/reference/sdk)
- [Reference API služby](/cs/reference/service-api)
