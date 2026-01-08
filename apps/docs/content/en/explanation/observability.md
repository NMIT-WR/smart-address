# Observability

## Goal

Explain how Smart Address captures one wide event per request and emits traces via Effect + OpenTelemetry, so debugging stays fast without log spam.

## Prerequisites

- (Optional) Local OpenTelemetry backend for viewing traces:

```bash
docker run -p 3000:3000 -p 4317:4317 -p 4318:4318 --rm -it docker.io/grafana/otel-lgtm
```

- Run the service with OTEL enabled (see Inputs).

## Inputs

Environment variables that control observability:

- `SMART_ADDRESS_OTEL_ENABLED` (default: `true`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` (default: `http://localhost:4318/v1/traces`)
- `OTEL_SERVICE_NAME` (default: `smart-address-service`)
- `OTEL_SERVICE_VERSION` (optional)
- `SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` (default: `1` in dev, `0.05` in production)
- `SMART_ADDRESS_WIDE_EVENT_SLOW_MS` (default: `2000`)

Copy-paste example (local tracing):

```bash
docker run -p 3000:3000 -p 4317:4317 -p 4318:4318 --rm -it docker.io/grafana/otel-lgtm

SMART_ADDRESS_OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/traces" \
OTEL_SERVICE_NAME="smart-address-service" \
SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE=1 \
pnpm --filter @smart-address/service-bun dev
```

## Output

- One wide event per request (HTTP, RPC, MCP) with request context, cache outcomes, provider timings, and result counts.
- A trace span per request, with nested spans for provider plans/stages/providers.
- Tail sampling keeps errors, slow requests, and manually marked requests, sampling the rest.
- HTTP responses include `x-request-id` (echoed if provided, otherwise generated).

## Errors

- If the OTEL endpoint is unreachable, the service still runs but spans are not exported.
- Tail sampling may intentionally drop fast successful requests.

## See also

- Effect tracing: https://effect.website/docs/observability/tracing/
- Wide events and tail sampling: https://loggingsucks.com/
