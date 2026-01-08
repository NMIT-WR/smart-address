#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SERVICE_PID=""
COMPOSE_UP="0"
COMPOSE_FILES=(-f deploy/compose/obs.yaml -f deploy/compose/app.yaml)

if [[ -x "$ROOT_DIR/scripts/free-ports.sh" ]]; then
  "$ROOT_DIR/scripts/free-ports.sh"
fi

cleanup() {
  if [[ -n "${SERVICE_PID}" ]]; then
    kill "${SERVICE_PID}" 2>/dev/null || true
    wait "${SERVICE_PID}" 2>/dev/null || true
  fi
  if [[ "${COMPOSE_UP}" == "1" ]]; then
    docker compose "${COMPOSE_FILES[@]}" down
  fi
}

trap cleanup EXIT

run() {
  echo "==> $*"
  "$@"
}

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

run pnpm install
run pnpm check
run pnpm typecheck
run pnpm test
run pnpm check:quality
run pnpm check:publint
run pnpm check:tree
run pnpm build
run pnpm --filter docs build
run pnpm --filter landing test
run pnpm --filter landing build
run pnpm --filter @smart-address/sdk test

run pnpm --filter @smart-address/service-bun start &
SERVICE_PID=$!

if ! wait_for_health; then
  echo "Service failed to become healthy on http://localhost:8787/health"
  exit 1
fi

run curl -fsS "http://localhost:8787/health"
run curl -fsS "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"
run curl -fsS -X POST "http://localhost:8787/accept" \
  -H "content-type: application/json" \
  --data @- <<'JSON'
{"text":"Prague","strategy":"reliable","resultIndex":0,"resultCount":5,"suggestion":{"id":"nominatim:123","label":"Prague, CZ","address":{"city":"Prague","countryCode":"CZ"},"source":{"provider":"nominatim","kind":"public"}}}
JSON

kill "${SERVICE_PID}" 2>/dev/null || true
wait "${SERVICE_PID}" 2>/dev/null || true
SERVICE_PID=""

run docker build -t smart-address-service .
run docker compose "${COMPOSE_FILES[@]}" up -d
COMPOSE_UP="1"

if ! wait_for_health; then
  echo "Docker service failed to become healthy on http://localhost:8787/health"
  exit 1
fi

run curl -fsS "http://localhost:8787/health"
run curl -fsS "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"

docker compose "${COMPOSE_FILES[@]}" down
COMPOSE_UP="0"
