import { Effect } from "effect"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import type * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import type {
  AddressProvider,
  AddressQuery,
  AddressSuggestion
} from "@smart-address/core"
import { makeAddressProvider } from "@smart-address/core"

export type HttpAddressProviderConfig = {
  readonly name: string
  readonly buildRequest: (query: AddressQuery) => HttpClientRequest.HttpClientRequest
  readonly parseResponse: (
    response: HttpClientResponse.HttpClientResponse
  ) => Effect.Effect<ReadonlyArray<AddressSuggestion>, unknown, never>
}

export const makeHttpAddressProvider = (
  config: HttpAddressProviderConfig
): AddressProvider<HttpClient.HttpClient> =>
  makeAddressProvider<HttpClient.HttpClient>(config.name, (query) =>
    HttpClient.execute(config.buildRequest(query)).pipe(
      Effect.flatMap((response) => config.parseResponse(response))
    )
  )

export { HttpClientRequest }
