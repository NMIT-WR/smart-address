import { execute, type HttpClient } from "@effect/platform/HttpClient";
import type { HttpClientRequest as HttpClientRequestType } from "@effect/platform/HttpClientRequest";
import type { HttpClientResponse } from "@effect/platform/HttpClientResponse";
import type {
  AddressProvider,
  AddressQuery,
  AddressSuggestion,
} from "@smart-address/core";
import { makeAddressProvider } from "@smart-address/core";
import { Effect } from "effect";

export interface HttpAddressProviderConfig {
  readonly name: string;
  readonly buildRequest: (query: AddressQuery) => HttpClientRequestType;
  readonly parseResponse: (
    response: HttpClientResponse
  ) => Effect.Effect<readonly AddressSuggestion[], unknown, never>;
}

export const makeHttpAddressProvider = (
  config: HttpAddressProviderConfig
): AddressProvider<HttpClient> =>
  makeAddressProvider<HttpClient>(config.name, (query) =>
    execute(config.buildRequest(query)).pipe(
      Effect.flatMap((response) => config.parseResponse(response))
    )
  );

export type HttpClientRequest = HttpClientRequestType;
