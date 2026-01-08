#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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

wait_for_health() {
  local attempts=30
  local i=1
  while [[ "${i}" -le "${attempts}" ]]; do
    if curl -fsS "http://localhost:8787/health" >/dev/null; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

echo "==> Starting observability stack"
"${COMPOSE[@]}" up -d

if ! wait_for_health; then
  echo "Service failed to become healthy on http://localhost:8787/health"
  exit 1
fi

start_time="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "==> Hitting /suggest and /metrics"
curl -fsS "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ" >/dev/null
curl -fsS "http://localhost:8787/metrics" >/dev/null

echo "==> Checking OTLP endpoint reachability"
if ! curl -s --connect-timeout 3 "http://localhost:4318" >/dev/null; then
  echo "OTLP HTTP endpoint not reachable on http://localhost:4318"
  exit 1
fi

echo "==> Checking for wide event log line"
if ! "${COMPOSE[@]}" logs --since "${start_time}" --no-color smart-address | grep -q '"kind":"suggest"'; then
  echo "Wide event log line not found in smart-address logs"
  exit 1
fi

echo "PASS: observability smoke test completed"
