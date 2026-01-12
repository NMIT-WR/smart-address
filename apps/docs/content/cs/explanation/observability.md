# Observabilita

## Cíl

Vysvětlit, jak Smart Address ukládá jeden wide event na request a emituje trace přes Effect + OpenTelemetry, aby se dalo rychle debugovat bez log spamu.

## Předpoklady

- Docker + Docker Compose.
- (Volitelně) Lokální OpenTelemetry backend pro zobrazení trace:

```bash
docker compose -f deploy/compose/obs.yaml up -d
```

- Spusťte službu s OTEL zapnutým (viz Vstupy).

## Vstupy

Environment proměnné, které řídí observabilitu:

- `SMART_ADDRESS_OTEL_ENABLED` (default: `true`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` (default: `http://localhost:4318`)
- `OTEL_SERVICE_NAME` (default: `smart-address-service`)
- `OTEL_SERVICE_VERSION` (volitelné)
- `SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` (default: `1`)
- `SMART_ADDRESS_WIDE_EVENT_SLOW_MS` (default: `2000`)
- `SMART_ADDRESS_LOG_RAW_QUERY` (default: `true` v dev, `false` v produkci)

Copy-paste příklad (lokální tracing):

```bash
docker compose -f deploy/compose/obs.yaml up -d

SMART_ADDRESS_OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318" \
OTEL_SERVICE_NAME="smart-address-service" \
SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE=1 \
pnpm --filter @smart-address/service-bun dev
```

Spuštění služby a LGTM dohromady (Docker):

```bash
docker compose -f deploy/compose/obs.yaml -f deploy/compose/app.yaml up -d
```

Posílání logů a metrik do LGTM přes Alloy:

```bash
docker compose -f deploy/compose/obs.yaml -f deploy/compose/app.yaml -f deploy/compose/alloy.yaml up -d
```

## Výstup

- Jeden wide event na request (HTTP, RPC, MCP) s kontextem, cache výsledky, provider časy a počty výsledků.
- Trace span pro každý request s vnořenými spany pro plány/stage/provider.
- Wide eventy se ukládají pro každý request; když nastavíte `SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` pod `1`, tail sampling ponechá chyby, pomalé requesty a ručně označené requesty a zbytek sampleuje.
- HTTP odpovědi obsahují `x-request-id` (pokud je poslán, vrací se zpět; jinak se generuje).
- HTTP odpovědi obsahují `server-timing` s celkovou dobou requestu i časy providerů.
- Hlavička `traceparent` pokračuje upstream trace.
- Při zapnutém Alloy jdou JSON logy do Loki a Prometheus metriky se remote-write do LGTM.
- Grafana dashboardy jsou provisionované ve složce "Smart Address" (Overview, Beyla RED + Network, Traces + Span Metrics) při spuštění LGTM compose stacku; Grafanu otevřete na `http://localhost:3000`.
- Na Linuxu Beyla eBPF přidává RED + síťové metriky; Beyla spany jsou oddělené od Effect trace a lze je vypnout odebráním `traces` z `exports` a smazáním bloku `traces {}`.
- Na Linuxu Pyroscope eBPF přidává CPU profily v Pyroscope.
- Alerting: preferujte SLO burn-rate alerty před statickými prahy; statické prahy používejte jen jako guardrails.

## Chyby

- Pokud je OTEL endpoint nedostupný, služba běží dál, jen se neexportují trasy.
- Pokud zapnete tail sampling (`SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` < `1`), rychlé úspěšné requesty se mohou zahazovat.

## Viz také

- Effect tracing: https://effect.website/docs/observability/tracing/
- Wide events a tail sampling: https://loggingsucks.com/
- Linux eBPF návod: /cs/how-to/ebpf
