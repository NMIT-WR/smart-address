# Observabilita

## Cíl

Vysvětlit, jak Smart Address posílá jeden wide event na request a jak generuje trasy přes Effect + OpenTelemetry, aby byl debug rychlý bez log spamu.

## Předpoklady

- (Volitelné) Lokální OpenTelemetry backend pro prohlížení trace:

```bash
docker run -p 3000:3000 -p 4317:4317 -p 4318:4318 --rm -it docker.io/grafana/otel-lgtm
```

- Spusťte službu s OTEL zapnutým (viz Vstupy).

## Vstupy

Proměnné prostředí pro observabilitu:

- `SMART_ADDRESS_OTEL_ENABLED` (default: `true`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` (default: `http://localhost:4318/v1/traces`)
- `OTEL_SERVICE_NAME` (default: `smart-address-service`)
- `OTEL_SERVICE_VERSION` (volitelné)
- `SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE` (default: `1` v dev, `0.05` v production)
- `SMART_ADDRESS_WIDE_EVENT_SLOW_MS` (default: `2000`)

Copy-paste příklad (lokální tracing):

```bash
docker run -p 3000:3000 -p 4317:4317 -p 4318:4318 --rm -it docker.io/grafana/otel-lgtm

SMART_ADDRESS_OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/traces" \
OTEL_SERVICE_NAME="smart-address-service" \
SMART_ADDRESS_WIDE_EVENT_SAMPLE_RATE=1 \
pnpm --filter @smart-address/service-bun dev
```

## Výstup

- Jeden wide event na request (HTTP, RPC, MCP) s kontextem, cache výsledky, provider časy a počty výsledků.
- Trace span pro každý request s vnořenými spany pro plány/stage/provider.
- Tail sampling vždy ponechá chyby, pomalé requesty a ručně označené requesty; zbytek sampleuje.
- HTTP odpovědi obsahují `x-request-id` (pokud je poslán, vrací se zpět; jinak se generuje).
- HTTP odpovědi obsahují `server-timing` s celkovou dobou requestu a časy providerů.

## Chyby

- Pokud je OTEL endpoint nedostupný, služba běží dál, jen se neexportují trasy.
- Tail sampling může záměrně zahazovat rychlé úspěšné requesty.

## Viz také

- Effect tracing: https://effect.website/docs/observability/tracing/
- Wide events a tail sampling: https://loggingsucks.com/
