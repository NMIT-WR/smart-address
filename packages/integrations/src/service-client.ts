import { Data, Effect } from "effect"
import * as Schema from "effect/Schema"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import {
  normalizeAddressQuery,
  type AddressQuery,
  type AddressSuggestionResult
} from "@smart-address/core"
import { AddressSuggestionResultSchema } from "@smart-address/core/schema"

export type AddressStrategy = "fast" | "reliable"

export type AddressServiceRequest = AddressQuery & {
  readonly strategy?: AddressStrategy
}

export class AddressServiceClientError extends Data.TaggedError("AddressServiceClientError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export interface AddressServiceClient {
  readonly suggest: (
    request: AddressServiceRequest
  ) => Effect.Effect<AddressSuggestionResult, AddressServiceClientError, HttpClient.HttpClient>
}

export type AddressServiceClientConfig = {
  readonly baseUrl: string
}

export const makeAddressServiceClient = (config: AddressServiceClientConfig): AddressServiceClient => ({
  suggest: (request) =>
    Effect.gen(function* () {
      const normalized = normalizeAddressQuery(request)
      const payload = {
        ...normalized,
        strategy: request.strategy
      }

      const rawRequest = HttpClientRequest.post(new URL("/suggest", config.baseUrl), { acceptJson: true })
      const withBody = yield* HttpClientRequest.bodyJson(rawRequest, payload)
      const response = yield* HttpClient.execute(withBody)
      const ok = yield* HttpClientResponse.filterStatusOk(response)
      const body = yield* ok.json

      return yield* Schema.decodeUnknown(AddressSuggestionResultSchema)(body)
    }).pipe(
      Effect.mapError(
        (cause) =>
          new AddressServiceClientError({
            message: "Address service request failed",
            cause
          })
      )
    )
})
