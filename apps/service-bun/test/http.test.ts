import {
  fromWeb,
  type HttpServerRequest,
} from "@effect/platform/HttpServerRequest";
import type { HttpServerResponse } from "@effect/platform/HttpServerResponse";
import { describe, expect, it } from "@effect-native/bun-test";
import { Effect, Ref } from "effect";
import {
  type RecordedSpan,
  makeTestTracer,
} from "../../../test-utils/test-tracer";
import {
  handleAcceptPost,
  handleMetricsGet,
  handleSuggestGet,
  handleSuggestPost,
} from "../src/http";
import type { AddressMetrics } from "../src/metrics";
import { RequestEventConfigLayer } from "../src/request-event";
import {
  makeRequestUrl,
  makeRunAcceptRequest,
  makeSuggestPostRequest,
  parseJsonResponse,
} from "./http-helpers";

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

const runAcceptRequest = makeRunAcceptRequest(handleAcceptPost);
const requestEventConfigLayer = RequestEventConfigLayer({
  serviceName: "test-service",
  serviceVersion: "test",
  sampleRate: 1,
  slowThresholdMs: 0,
});

const expectSuggestResponse = (
  handler: (request: HttpServerRequest) => Effect.Effect<HttpServerResponse>,
  request: HttpServerRequest
) =>
  Effect.gen(function* () {
    const { web, body } = yield* parseJsonResponse(
      yield* handler(request).pipe(Effect.provide(requestEventConfigLayer))
    );

    expect(web.status).toBe(200);
    expect(body.suggestions[0]?.id).toBe("sample:1");
    expect(web.headers.get("server-timing")).toContain("total;dur=");
  });

describe("http handlers", () => {
  it.effect("handles GET /suggest", () =>
    Effect.gen(function* () {
      const request = fromWeb(
        new Request(makeRequestUrl("/suggest?text=Main&strategy=fast"))
      );
      yield* expectSuggestResponse(handleSuggestGet(suggestor), request);
    })
  );

  it.effect("propagates request metadata to child spans", () =>
    Effect.gen(function* () {
      const spans: RecordedSpan[] = [];
      const tracer = makeTestTracer(spans);
      const suggestorWithSpan = {
        suggest: () =>
          Effect.succeed(sampleResult).pipe(Effect.withSpan("child-suggest")),
      };
      const request = fromWeb(
        new Request(makeRequestUrl("/suggest?text=Main&strategy=fast"), {
          headers: { "x-request-id": "req-123" },
        })
      );

      yield* handleSuggestGet(suggestorWithSpan)(request).pipe(
        Effect.provide(requestEventConfigLayer),
        Effect.withTracer(tracer)
      );

      const childSpan = spans.find((span) => span.name === "child-suggest");
      expect(childSpan).toBeDefined();
      expect(childSpan?.attributes.get("request.id")).toBe("req-123");
      expect(childSpan?.attributes.get("request.kind")).toBe("suggest");
      expect(childSpan?.attributes.get("request.source")).toBe("http");
    })
  );

  it.effect("handles POST /suggest", () =>
    Effect.gen(function* () {
      const request = makeSuggestPostRequest({ text: "Main" });
      yield* expectSuggestResponse(handleSuggestPost(suggestor), request);
    })
  );

  it.effect("returns an error for missing text", () =>
    Effect.gen(function* () {
      const request = makeSuggestPostRequest({});
      const { web, body } = yield* parseJsonResponse(
        yield* handleSuggestPost(suggestor)(request).pipe(
          Effect.provide(requestEventConfigLayer)
        )
      );

      expect(web.status).toBe(400);
      expect(body.error).toBeTypeOf("string");
    })
  );

  it.effect("handles POST /accept", () =>
    Effect.gen(function* () {
      const { web, body } = yield* runAcceptRequest(
        acceptPayload,
        () => Effect.void
      ).pipe(Effect.provide(requestEventConfigLayer));

      expect(web.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(web.headers.get("server-timing")).toContain("total;dur=");
    })
  );

  it.effect("invokes accept log for POST /accept", () =>
    Effect.gen(function* () {
      const recorded = yield* Ref.make<unknown>(null);
      const { web } = yield* runAcceptRequest(acceptPayload, (payload) =>
        Ref.set(recorded, payload)
      ).pipe(Effect.provide(requestEventConfigLayer));
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
      const { web, body } = yield* runAcceptRequest(
        { suggestion: acceptPayload.suggestion },
        () => Effect.void
      ).pipe(Effect.provide(requestEventConfigLayer));

      expect(web.status).toBe(400);
      expect(body.error).toBeTypeOf("string");
    })
  );

  it.effect("handles GET /metrics", () =>
    Effect.gen(function* () {
      const request = fromWeb(new Request(makeRequestUrl("/metrics")));
      const { web, body } = yield* parseJsonResponse(
        yield* handleMetricsGet(metrics)(request).pipe(
          Effect.provide(requestEventConfigLayer)
        )
      );

      expect(web.status).toBe(200);
      expect(body.cache.requests).toBe(2);
      expect(body.cache.hitRate).toBe(0.5);
    })
  );
});
