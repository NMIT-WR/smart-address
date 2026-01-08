import { layer as otlpTracerLayer } from "@effect/opentelemetry/OtlpTracer";
import { Layer } from "effect";

interface OtelConfig {
  readonly enabled: boolean;
  readonly endpoint: string;
  readonly serviceName: string;
  readonly serviceVersion?: string | undefined;
}

export const makeOtelLayer = (config: OtelConfig) =>
  config.enabled
    ? otlpTracerLayer({
        url: config.endpoint,
        resource: {
          serviceName: config.serviceName,
          serviceVersion: config.serviceVersion,
        },
      })
    : Layer.empty;
