#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORTS="${PORTS:-8787 3000}"

kill_port() {
  local port="$1"
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN || true)"
  elif command -v ss >/dev/null 2>&1; then
    pids="$(ss -ltnp "sport = :${port}" 2>/dev/null | awk 'NR>1 {print $NF}' | sed 's/pid=//;s/,.*//' | sort -u | tr '\n' ' ' || true)"
  elif command -v netstat >/dev/null 2>&1; then
    pids="$(netstat -anvp tcp 2>/dev/null | awk -v p=":${port}" '$4 ~ p && $6 == "LISTEN" {print $9}' | sort -u | tr '\n' ' ' || true)"
  fi

  if [[ -n "${pids}" ]]; then
    echo "Killing processes on port ${port}: ${pids}"
    kill ${pids} 2>/dev/null || true
  fi
}

for port in ${PORTS}; do
  kill_port "${port}"
done

if command -v docker >/dev/null 2>&1; then
  docker compose down >/dev/null 2>&1 || true
fi
