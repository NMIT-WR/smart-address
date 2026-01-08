#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORTS="${PORTS:-8787 3000}"

usage() {
  cat <<'EOF'
Usage: PORTS="8787 3000" scripts/free-ports.sh

Frees any processes listening on the ports listed in $PORTS (default: "8787 3000")
by calling kill_port for each entry. If Docker is available, the script also
runs "docker compose down" to stop local compose services.
Override compose files via COMPOSE_FILES="path1:path2".
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

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
  # Use COMPOSE_FILES (colon-separated) when provided; otherwise target obs+app compose files.
  compose_files="${COMPOSE_FILES:-deploy/compose/obs.yaml:deploy/compose/app.yaml}"
  compose_args=()
  IFS=":" read -r -a compose_paths <<< "${compose_files}"
  for compose_path in "${compose_paths[@]}"; do
    compose_args+=(-f "${compose_path}")
  done
  docker compose "${compose_args[@]}" down >/dev/null 2>&1 || true
fi
