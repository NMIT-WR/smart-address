import { describe, expect, it } from "@effect-native/bun-test";
import { Effect } from "effect";
import {
  decodeSuggestPayload,
  payloadFromSearchParams,
  toSuggestRequest,
} from "../src/request";

describe("request parsing", () => {
  it.effect("parses search params into a suggest request", () =>
    Effect.gen(function* () {
      const params = {
        text: ["Main St"],
        limit: "5",
        countryCode: "cz",
        strategy: "fast",
      };

      const payload = payloadFromSearchParams(params);
      const decoded = yield* decodeSuggestPayload(payload);
      const request = yield* toSuggestRequest(decoded);

      expect(request.query.text).toBe("Main St");
      expect(request.query.limit).toBe(5);
      expect(request.query.countryCode).toBe("CZ");
      expect(request.strategy).toBe("fast");
    })
  );

  it.effect("fails when text is missing", () =>
    Effect.gen(function* () {
      const payload = {};
      const decoded = yield* decodeSuggestPayload(payload);
      const error = yield* toSuggestRequest(decoded).pipe(Effect.flip);
      expect(error).toMatchObject({ _tag: "SuggestRequestError" });
    })
  );
});
