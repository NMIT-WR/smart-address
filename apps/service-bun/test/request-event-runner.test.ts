import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import { TestContext } from "effect/TestContext";
import { RequestEventConfigLayer } from "../src/request-event";
import { runRequestEvent } from "../src/request-event-runner";

describe("request event runner", () => {
  it.effect("keeps the original failure when onFinalized fails", () =>
    Effect.gen(function* () {
      const result = yield* runRequestEvent(
        {
          requestId: "req_test",
          kind: "suggest",
          source: "http",
          method: "GET",
          path: "/suggest",
          spanName: "GET /suggest",
          spanAttributes: {
            "http.method": "GET",
            "http.route": "/suggest",
          },
        },
        Effect.fail("boom"),
        {
          statusCode: () => 500,
          onFinalized: () => Effect.fail("finalize"),
        }
      ).pipe(Effect.either);

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBe("boom");
      }
    }).pipe(
      Effect.provide(
        RequestEventConfigLayer({
          serviceName: "test-service",
          serviceVersion: "test",
          sampleRate: 1,
          slowThresholdMs: 0,
          logRawQuery: true,
        })
      ),
      Effect.provide(TestContext)
    )
  );
});
