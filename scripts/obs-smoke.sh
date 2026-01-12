#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/scripts/lib/wait-for-url.sh"

COMPOSE=(
  docker compose
  -f deploy/compose/obs.yaml
  -f deploy/compose/app.yaml
  -f deploy/compose/alloy.yaml
)

cleanup() {
  "${COMPOSE[@]}" down >/dev/null 2>&1 || true
}

trap cleanup EXIT

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for scripts/obs-smoke.sh" >&2
  exit 1
fi

wait_for_health() {
  wait_for_url "http://localhost:8787/health"
}

retry() {
  local attempts="${1:-10}"
  shift
  local i=1
  while [[ "${i}" -le "${attempts}" ]]; do
    if "$@"; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

# NOTE: Prometheus query must be URL-encoded (e.g. %7B for "{").
prom_query_has_value() {
  local query="$1"
  local payload=""
  if ! payload="$(curl -fsS "http://localhost:9090/api/v1/query?query=${query}" 2>/dev/null)"; then
    return 1
  fi
  if [[ -z "${payload}" ]]; then
    return 1
  fi
  printf '%s' "${payload}" | python3 -c '
import json
import sys

raw = sys.stdin.read().strip()
if not raw:
  sys.exit(1)

try:
  data = json.loads(raw)
except Exception:
  sys.exit(1)

result = data.get("data", {}).get("result", [])
max_value = 0.0
for entry in result:
  try:
    max_value = max(max_value, float(entry.get("value", [0, 0])[1]))
  except Exception:
    continue

sys.exit(0 if max_value > 0 else 1)
'
}

check_beyla_spanmetrics() {
  prom_query_has_value "traces_spanmetrics_calls_total%7Bservice%3D%22smart-address%22%7D"
}

check_loki_streams() {
  local start_ns=""
  local end_ns=""
  local payload=""
  start_ns=$((($(date +%s) - 600) * 1000000000))
  end_ns=$(($(date +%s) * 1000000000))
  if ! payload="$("${COMPOSE[@]}" exec -T lgtm sh -c "curl -fsS 'http://127.0.0.1:3100/loki/api/v1/query_range?query=%7Bjob%3D%22smart-address%22%2Ckind%3D%22suggest%22%7D&start=${start_ns}&end=${end_ns}&limit=1'")"; then
    return 1
  fi
  if [[ -z "${payload}" ]]; then
    return 1
  fi
  printf '%s' "${payload}" | python3 -c '
import json
import sys

raw = sys.stdin.read().strip()
if not raw:
  sys.exit(1)

try:
  data = json.loads(raw)
except Exception:
  sys.exit(1)

result = data.get("data", {}).get("result", [])
sys.exit(0 if len(result) > 0 else 1)
'
}

check_wide_event_log() {
  local logs=""
  logs="$("${COMPOSE[@]}" logs --tail 200 --no-color smart-address)"
  grep -q '"kind":"suggest"' <<<"${logs}"
}

echo "==> Starting observability stack"
"${COMPOSE[@]}" up -d

if ! wait_for_health; then
  echo "Service failed to become healthy on http://localhost:8787/health"
  exit 1
fi

echo "==> Hitting /suggest and /metrics"
curl -fsS "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ" >/dev/null
curl -fsS "http://localhost:8787/metrics" >/dev/null
sleep 1

echo "==> Checking Grafana health"
if ! curl -fsS "http://localhost:3000/api/health" >/dev/null; then
  echo "Grafana health endpoint not reachable on http://localhost:3000/api/health"
  exit 1
fi

echo "==> Checking OTLP endpoint reachability"
otlp_code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 5 "http://localhost:4318" || true)"
if [[ -z "${otlp_code}" || "${otlp_code}" == "000" ]]; then
  echo "OTLP HTTP endpoint not reachable on http://localhost:4318"
  exit 1
fi

echo "==> Checking Prometheus metrics (smart_address_cache_requests_total)"
if ! retry 20 prom_query_has_value "smart_address_cache_requests_total"; then
  echo "Prometheus metric smart_address_cache_requests_total not observed"
  exit 1
fi

echo "==> Checking Beyla metrics (beyla_network_flow_bytes_total)"
if ! retry 20 prom_query_has_value "beyla_network_flow_bytes_total"; then
  echo "Beyla network metrics not observed in Prometheus"
  exit 1
fi

echo "==> Checking for wide event log line"
if ! retry 10 check_wide_event_log; then
  echo "Wide event log line not found in smart-address logs"
  exit 1
fi

echo "==> Checking Loki ingestion (job=smart-address, kind=suggest)"
if ! retry 10 check_loki_streams; then
  echo "Loki did not return smart-address suggest logs"
  exit 1
fi

echo "==> Checking Beyla spans in Tempo (spanmetrics)"
if ! retry 20 check_beyla_spanmetrics; then
  echo "Beyla spans not observed via spanmetrics for service=smart-address"
  exit 1
fi

echo "PASS: observability smoke test completed"
