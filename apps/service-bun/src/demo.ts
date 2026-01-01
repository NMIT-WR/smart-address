import { fileURLToPath } from "node:url";
import { file, html } from "@effect/platform/HttpServerResponse";
import { Effect } from "effect";

const sdkPath = fileURLToPath(
  new URL("../../../packages/sdk/dist/smart-address.js", import.meta.url)
);

const legacyDemoHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Smart Address legacy demo</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
    />
    <style>
      body {
        background: #f8f9fa;
      }

      .demo-card {
        max-width: 520px;
      }
    </style>
  </head>
  <body>
    <div class="container py-3">
      <div class="demo-card">
        <label for="address-input" class="form-label">Shipping address</label>
        <div class="position-relative">
          <input
            id="address-input"
            class="form-control"
            autocomplete="off"
            placeholder="Start typing an address"
          />
          <div
            id="address-results"
            class="list-group position-absolute w-100 d-none"
            style="z-index: 1000"
          ></div>
        </div>
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
</html>`;

export const handleLegacyDemo = () => html(legacyDemoHtml);

export const handleSdkModule = () =>
  file(sdkPath, {
    contentType: "text/javascript",
  }).pipe(Effect.orDie);
