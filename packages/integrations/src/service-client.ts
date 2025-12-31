import { execute, type HttpClient } from "@effect/platform/HttpClient";
import { bodyJson, post } from "@effect/platform/HttpClientRequest";
import { filterStatusOk } from "@effect/platform/HttpClientResponse";
import {
  type AddressQuery,
  type AddressSuggestionResult,
  normalizeAddressQuery,
} from "@smart-address/core";
import { AddressSuggestionResultSchema } from "@smart-address/core/schema";
import { Data, Effect } from "effect";
import { decodeUnknown } from "effect/Schema";

export type AddressStrategy = "fast" | "reliable";

export type AddressServiceRequest = AddressQuery & {
  readonly strategy?: AddressStrategy;
};

export class AddressServiceClientError extends Data.TaggedError(
  "AddressServiceClientError"
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export interface AddressServiceClient {
  readonly suggest: (
    request: AddressServiceRequest
  ) => Effect.Effect<
    AddressSuggestionResult,
    AddressServiceClientError,
    HttpClient
  >;
}

export interface AddressServiceClientConfig {
  readonly baseUrl: string;
}

export const makeAddressServiceClient = (
  config: AddressServiceClientConfig
): AddressServiceClient => ({
  suggest: (request) =>
    Effect.gen(function* () {
      const normalized = normalizeAddressQuery(request);
      const payload = {
        ...normalized,
        strategy: request.strategy,
      };

      const rawRequest = post(new URL("/suggest", config.baseUrl), {
        acceptJson: true,
      });
      const withBody = yield* bodyJson(rawRequest, payload);
      const response = yield* execute(withBody);
      const ok = yield* filterStatusOk(response);
      const body = yield* ok.json;

      return yield* decodeUnknown(AddressSuggestionResultSchema)(body);
    }).pipe(
      Effect.mapError(
        (cause) =>
          new AddressServiceClientError({
            message: "Address service request failed",
            cause,
          })
      )
    ),
});
