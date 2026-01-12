#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/scripts/lib/wait-for-url.sh"

SERVICE_PID=""
SERVICE_PGID=""
COMPOSE_UP="0"
COMPOSE_FILES=(-f deploy/compose/obs.yaml -f deploy/compose/alloy.yaml -f deploy/compose/app.yaml)

run() {
  echo "==> $*"
  "$@"
}

start_service() {
  echo "==> pnpm --filter @smart-address/service-bun start"
  if command -v setsid >/dev/null 2>&1; then
    setsid pnpm --filter @smart-address/service-bun start &
    SERVICE_PID=$!
    SERVICE_PGID=$SERVICE_PID
  else
    pnpm --filter @smart-address/service-bun start &
    SERVICE_PID=$!
    SERVICE_PGID=""
  fi
}

stop_service() {
  if [[ -n "${SERVICE_PID}" ]]; then
    if [[ -n "${SERVICE_PGID}" ]]; then
      kill -- -"${SERVICE_PGID}" 2>/dev/null || kill "${SERVICE_PID}" 2>/dev/null || true
    else
      kill "${SERVICE_PID}" 2>/dev/null || true
    fi
    for _ in {1..10}; do
      if ! kill -0 "${SERVICE_PID}" 2>/dev/null; then
        break
      fi
      sleep 1
    done
    if kill -0 "${SERVICE_PID}" 2>/dev/null; then
      echo "Warning: service did not exit after SIGTERM, sending SIGKILL" >&2
      if [[ -n "${SERVICE_PGID}" ]]; then
        kill -9 -- -"${SERVICE_PGID}" 2>/dev/null || kill -9 "${SERVICE_PID}" 2>/dev/null || true
      else
        kill -9 "${SERVICE_PID}" 2>/dev/null || true
      fi
    fi
    wait "${SERVICE_PID}" 2>/dev/null || true
    SERVICE_PID=""
    SERVICE_PGID=""
  fi
}

if [[ -x "$ROOT_DIR/scripts/free-ports.sh" ]]; then
  "$ROOT_DIR/scripts/free-ports.sh" || \
    echo "Warning: free-ports.sh failed, continuing anyway" >&2
fi

cleanup() {
  stop_service
  if [[ "${COMPOSE_UP}" == "1" ]]; then
    docker compose "${COMPOSE_FILES[@]}" down >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

wait_for_health() {
  wait_for_url "http://localhost:8787/health"
}

wait_for_suggest() {
  wait_for_url "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"
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

start_service

if ! wait_for_health; then
  echo "Service failed to become healthy on http://localhost:8787/health"
  exit 1
fi

run curl -fsS "http://localhost:8787/health"
if ! wait_for_suggest; then
  echo "Service failed to respond to /suggest on http://localhost:8787/suggest"
  exit 1
fi
run curl -fsS "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"
run curl -fsS -X POST "http://localhost:8787/accept" \
  -H "content-type: application/json" \
  --data @- <<'JSON'
{
  "text": "Prague",
  "strategy": "reliable",
  "resultIndex": 0,
  "resultCount": 5,
  "suggestion": {
    "id": "nominatim:123",
    "label": "Prague, CZ",
    "address": {
      "city": "Prague",
      "countryCode": "CZ"
    },
    "source": {
      "provider": "nominatim",
      "kind": "public"
    }
  }
}
JSON

stop_service

if [[ -x "$ROOT_DIR/scripts/free-ports.sh" ]]; then
  "$ROOT_DIR/scripts/free-ports.sh" || \
    echo "Warning: free-ports.sh failed, continuing anyway" >&2
fi

run docker build -t smart-address-service .
run docker compose "${COMPOSE_FILES[@]}" up -d
COMPOSE_UP="1"

if ! wait_for_health; then
  echo "Docker service failed to become healthy on http://localhost:8787/health"
  exit 1
fi

run curl -fsS "http://localhost:8787/health"
if ! wait_for_suggest; then
  echo "Docker service failed to respond to /suggest on http://localhost:8787/suggest"
  exit 1
fi
run curl -fsS "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ"

run docker compose "${COMPOSE_FILES[@]}" down
COMPOSE_UP="0"
