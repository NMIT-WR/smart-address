import { describe, expect, it } from "bun:test";
import { type AddressStrategy, createClient } from "../src/client";

const makeFetch =
  (calls: string[], payload = { suggestions: [], errors: [] }) =>
  (input: RequestInfo | URL, _init?: RequestInit) => {
    calls.push(String(input));
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  };

const makeFetchWithInit =
  (calls: Array<{ url: string; init?: RequestInit }>, payload = { ok: true }) =>
  (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  };

describe("smart-address sdk", () => {
  it("uses provided fetch and builds query params", async () => {
    const calls: string[] = [];
    const client = createClient({
      baseUrl: "https://example.test",
      key: "docs-demo",
      fetch: makeFetch(calls),
    });

    await client.suggest({
      text: "Prague",
      limit: 5,
      countryCode: "cz",
      sessionToken: "session-1",
      strategy: "reliable",
    });

    expect(calls.length).toBe(1);
    expect(calls[0]).toBe(
      "https://example.test/suggest?text=Prague&limit=5&countryCode=CZ&sessionToken=session-1&strategy=reliable&key=docs-demo"
    );
  });

  it("preserves base path when building suggest url", async () => {
    const calls: string[] = [];
    const client = createClient({
      baseUrl: "https://example.test/api/v1/",
      fetch: makeFetch(calls),
    });

    await client.suggest({ text: "Prague" });

    const url = new URL(calls[0] ?? "");
    expect(url.pathname).toBe("/api/v1/suggest");
  });

  it("omits limit when zero or negative", async () => {
    const calls: string[] = [];
    const client = createClient({
      baseUrl: "https://example.test/suggest",
      fetch: makeFetch(calls),
    });

    await client.suggest({ text: "Praha", limit: 0 });

    expect(calls.length).toBe(1);
    const url = new URL(calls[0]);
    expect(url.pathname).toBe("/suggest");
    expect(url.searchParams.has("limit")).toBe(false);
  });

  it("rejects unsupported strategies", async () => {
    const calls: string[] = [];
    const client = createClient({
      baseUrl: "https://example.test",
      fetch: makeFetch(calls),
    });

    await expect(
      client.suggest({ text: "Prague", strategy: "fastest" as AddressStrategy })
    ).rejects.toThrow("Invalid strategy. Expected 'fast' or 'reliable'.");
    expect(calls.length).toBe(0);
  });

  it("filters invalid suggestion payloads", async () => {
    const calls: string[] = [];
    const client = createClient({
      baseUrl: "https://example.test",
      fetch: makeFetch(calls, {
        suggestions: [
          {
            id: "ok",
            label: "Ok",
            address: {},
            source: { provider: "nominatim" },
          },
          {
            id: "bad-label",
            label: 123,
            address: {},
            source: { provider: "nominatim" },
          },
          {
            id: "missing-source",
            label: "Missing source",
            address: {},
          },
        ],
        errors: [
          { provider: "nominatim", message: "timeout" },
          { provider: 123, message: "bad" },
        ],
      }),
    });

    const result = await client.suggest({ text: "Prague" });

    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0]?.id).toBe("ok");
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.provider).toBe("nominatim");
  });

  it("posts accept payload to /accept", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = createClient({
      baseUrl: "https://example.test/suggest",
      key: "docs-demo",
      fetch: makeFetchWithInit(calls),
    });

    await client.accept({
      text: "Prague",
      strategy: "reliable",
      resultIndex: 1,
      resultCount: 5,
      suggestion: {
        id: "demo:1",
        label: "Prague",
        address: {},
        source: { provider: "demo" },
      },
    });

    expect(calls.length).toBe(1);
    expect(calls[0]?.url).toBe("https://example.test/accept?key=docs-demo");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(String(calls[0]?.init?.body ?? "{}"));
    expect(body.text).toBe("Prague");
    expect(body.suggestion.id).toBe("demo:1");
    expect(body.resultIndex).toBe(1);
    expect(body.resultCount).toBe(5);
  });
});
