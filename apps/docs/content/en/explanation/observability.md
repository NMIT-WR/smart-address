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
- `OTEL_EXPORTER_OTLP_ENDPOINT` (default: `http://localhost:4318`)
- `OTEL_SERVICE_NAME` (default: `smart-address-service`)
- `OTEL_SERVICE_VERSION` (optional)
- `SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` (default: `1`)
- `SMART_ADDRESS_WIDE_EVENT_SLOW_MS` (default: `2000`)
- `SMART_ADDRESS_LOG_RAW_QUERY` (default: `true` in dev, `false` in production)

Copy-paste example (local tracing):

```bash
docker compose -f deploy/compose/obs.yaml up -d

SMART_ADDRESS_OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318" \
OTEL_SERVICE_NAME="smart-address-service" \
SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE=1 \
pnpm --filter @smart-address/service-bun dev
```

Run the service and LGTM together (Docker):

```bash
docker compose -f deploy/compose/obs.yaml -f deploy/compose/app.yaml up -d
```

Ship logs + metrics to LGTM via Alloy:

```bash
docker compose -f deploy/compose/obs.yaml -f deploy/compose/app.yaml -f deploy/compose/alloy.yaml up -d
```

## Output

- One wide event per request (HTTP, RPC, MCP) with request context, cache outcomes, provider timings, and result counts.
- A trace span per request, with nested spans for provider plans/stages/providers.
- Wide events are recorded for every request by default; set `SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` below `1` to enable tail sampling (keeps errors, slow requests, and manually marked requests while sampling the rest).
- HTTP responses include `x-request-id` (echoed if provided, otherwise generated).
- HTTP responses include `server-timing` with total request duration and provider timings.
- Incoming `traceparent` headers continue an upstream trace.
- When Alloy is enabled, JSON logs flow to Loki and Prometheus metrics are remote-written into LGTM.
- Grafana dashboards are provisioned under the "Smart Address" folder (Overview, Beyla RED + Network, Traces + Span Metrics) when you run the LGTM compose stack; open Grafana at `http://localhost:3000`.
- On Linux, Beyla eBPF adds RED + network metrics; Beyla spans are separate from Effect traces and can be disabled by removing `traces` from `exports` and deleting the `traces {}` block.
- On Linux, Pyroscope eBPF adds CPU profiles in Pyroscope.
- Alerting: prefer SLO burn-rate alerts over static thresholds; keep static thresholds only as guardrails.

## Errors

- If the OTEL endpoint is unreachable, the service still runs but spans are not exported.
- If you enable tail sampling (`SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` < `1`), fast successful requests may be dropped.

## See also

- Effect tracing: https://effect.website/docs/observability/tracing/
- Wide events and tail sampling: https://loggingsucks.com/
- Linux eBPF how-to: /how-to/ebpf
