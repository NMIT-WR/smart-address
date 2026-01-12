#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f deploy/compose/obs.yaml)

cleanup() {
  "${COMPOSE[@]}" down >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "==> Starting LGTM (Grafana + Tempo + Loki + Prometheus + Pyroscope)"
"${COMPOSE[@]}" up -d

echo "==> Starting smart-address (Bun, local)"
pnpm --filter @smart-address/service-bun dev
