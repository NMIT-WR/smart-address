import { fromWeb } from "@effect/platform/HttpServerRequest";
import { toWeb } from "@effect/platform/HttpServerResponse";
import { describe, expect, it } from "@effect-native/bun-test";
import { Effect, Ref } from "effect";
import {
  handleAcceptPost,
  handleMetricsGet,
  handleSuggestGet,
  handleSuggestPost,
} from "../src/http";
import type { AddressMetrics } from "../src/metrics";

const sampleResult = {
  suggestions: [
    {
      id: "sample:1",
      label: "Sample",
      address: { line1: "Sample" },
      source: { provider: "sample" },
    },
  ],
  errors: [],
};

const suggestor = {
  suggest: () => Effect.succeed(sampleResult),
};

const acceptPayload = {
  text: "Main",
  suggestion: {
    id: "sample:1",
    label: "Sample",
    address: { line1: "Sample" },
    source: { provider: "sample" },
  },
  resultIndex: 0,
  resultCount: 1,
};

const metricsSnapshot = {
  startedAt: 1000,
  updatedAt: 2000,
  cache: {
    requests: 2,
    hits: 1,
    l1Hits: 1,
    l1Misses: 1,
    l2Hits: 0,
    l2Misses: 1,
    hitRate: 0.5,
    l1HitRate: 0.5,
    l2HitRate: 0,
  },
  providers: [],
};

const metrics: AddressMetrics = {
  recordCache: () => Effect.void,
  recordProvider: () => Effect.void,
  snapshot: Effect.succeed(metricsSnapshot),
};

describe("http handlers", () => {
  it.effect("handles GET /suggest", () =>
    Effect.gen(function* () {
      const request = fromWeb(
        new Request("http://localhost/suggest?text=Main&strategy=fast")
      );

      const response = yield* handleSuggestGet(suggestor)(request);
      const web = toWeb(response);
      const body = yield* Effect.promise(() => web.json());

      expect(web.status).toBe(200);
      expect(body.suggestions[0]?.id).toBe("sample:1");
    })
  );

  it.effect("handles POST /suggest", () =>
    Effect.gen(function* () {
      const request = fromWeb(
        new Request("http://localhost/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "Main" }),
        })
      );

      const response = yield* handleSuggestPost(suggestor)(request);
      const web = toWeb(response);
      const body = yield* Effect.promise(() => web.json());

      expect(web.status).toBe(200);
      expect(body.suggestions[0]?.id).toBe("sample:1");
    })
  );

  it.effect("returns an error for missing text", () =>
    Effect.gen(function* () {
      const request = fromWeb(
        new Request("http://localhost/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        })
      );

      const response = yield* handleSuggestPost(suggestor)(request);
      const web = toWeb(response);
      const body = yield* Effect.promise(() => web.json());

      expect(web.status).toBe(400);
      expect(body.error).toBeTypeOf("string");
    })
  );

  it.effect("handles POST /accept", () =>
    Effect.gen(function* () {
      const request = fromWeb(
        new Request("http://localhost/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(acceptPayload),
        })
      );

      const response = yield* handleAcceptPost({
        record: () => Effect.void,
      })(request);
      const web = toWeb(response);
      const body = yield* Effect.promise(() => web.json());

      expect(web.status).toBe(200);
      expect(body.ok).toBe(true);
    })
  );

  it.effect("invokes accept log for POST /accept", () =>
    Effect.gen(function* () {
      const recorded = yield* Ref.make<unknown>(null);
      const request = fromWeb(
        new Request("http://localhost/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(acceptPayload),
        })
      );

      const response = yield* handleAcceptPost({
        record: (payload) => Ref.set(recorded, payload),
      })(request);
      const web = toWeb(response);
      yield* Effect.promise(() => web.json());
      const logged = yield* Ref.get(recorded);

      expect(web.status).toBe(200);
      expect(logged).not.toBeNull();
      expect((logged as { suggestion?: { id?: string } }).suggestion?.id).toBe(
        "sample:1"
      );
    })
  );

  it.effect("returns an error for invalid accept payload", () =>
    Effect.gen(function* () {
      const request = fromWeb(
        new Request("http://localhost/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ suggestion: acceptPayload.suggestion }),
        })
      );

      const response = yield* handleAcceptPost({
        record: () => Effect.void,
      })(request);
      const web = toWeb(response);
      const body = yield* Effect.promise(() => web.json());

      expect(web.status).toBe(400);
      expect(body.error).toBeTypeOf("string");
    })
  );

  it.effect("handles GET /metrics", () =>
    Effect.gen(function* () {
      const request = fromWeb(new Request("http://localhost/metrics"));
      const response = yield* handleMetricsGet(metrics)(request);
      const web = toWeb(response);
      const body = yield* Effect.promise(() => web.json());

      expect(web.status).toBe(200);
      expect(body.cache.requests).toBe(2);
      expect(body.cache.hitRate).toBe(0.5);
    })
  );
});
