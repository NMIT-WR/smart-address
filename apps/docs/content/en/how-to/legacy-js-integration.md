# Integrate legacy checkout (Bootstrap + vanilla JS)

## Goal

Add address suggestions to a legacy checkout page using the Smart Address SDK without a bundler.

## Prerequisites

- Smart Address service base URL (example: `https://api.example.com`).
- API key for `?key=`.
- Bootstrap 5 CSS (optional, used in the example).
- Browser with `fetch` and `AbortController`.

## Inputs

- SDK config: `baseUrl`, `key` (sent as `?key=`).
- Suggest request: `text` (required), `limit`, `countryCode`, `locale`, `sessionToken`, `strategy`.

## Steps

### 1) Copy-paste example

```html
<!doctype html>
<html lang="en">
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

    <script src="https://unpkg.com/@smart-address/sdk/dist/umd/smart-address.js"></script>
    <script>
      const client = SmartAddress.createClient({
        baseUrl: "https://api.example.com",
        key: "YOUR_KEY"
      })

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

        suggestions.forEach((suggestion) => {
          const item = document.createElement("button")
          item.type = "button"
          item.className = "list-group-item list-group-item-action"
          item.textContent = suggestion.label
          item.addEventListener("click", () => selectSuggestion(suggestion))
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

      const selectSuggestion = (suggestion) => {
        input.value = suggestion.label
        clearResults()
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
          selectSuggestion(items[activeIndex])
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

## Output

- Suggestions appear under the input.
- Selecting a suggestion fills the input.

## Errors

- Network or 4xx/5xx responses throw.
- Invalid payloads return `400` with `{ "error": "..." }`.
- Aborted requests raise `AbortError`.

## See also

- [Clients and SDKs](/reference/sdk)
- [Service API reference](/reference/service-api)
