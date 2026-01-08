# Observability

## Goal

Explain how Smart Address captures one wide event per request and emits traces via Effect + OpenTelemetry, so debugging stays fast without log spam.

## Prerequisites

- Docker + Docker Compose.
- (Optional) Local OpenTelemetry backend for viewing traces:

```bash
docker compose -f deploy/compose/obs.yaml up -d
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
docker compose -f deploy/compose/obs.yaml up -d

SMART_ADDRESS_OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/traces" \
OTEL_SERVICE_NAME="smart-address-service" \
SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE=1 \
pnpm --filter @smart-address/service-bun dev
```

Run the service and LGTM together (Docker):

```bash
docker compose -f deploy/compose/obs.yaml -f deploy/compose/app.yaml up -d
```

## Output

- One wide event per request (HTTP, RPC, MCP) with request context, cache outcomes, provider timings, and result counts.
- A trace span per request, with nested spans for provider plans/stages/providers.
- Tail sampling keeps errors, slow requests, and manually marked requests, sampling the rest.
- HTTP responses include `x-request-id` (echoed if provided, otherwise generated).
- HTTP responses include `server-timing` with total request duration and provider timings.

## Errors

- If the OTEL endpoint is unreachable, the service still runs but spans are not exported.
- Tail sampling may intentionally drop fast successful requests.

## See also

- Effect tracing: https://effect.website/docs/observability/tracing/
- Wide events and tail sampling: https://loggingsucks.com/
