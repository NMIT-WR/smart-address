#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

target_context="${1:-${SMART_ADDRESS_LINUX_DOCKER_CONTEXT:-}}"

if [[ -z "${target_context}" ]]; then
  for candidate in colima lima rancher-desktop podman; do
    if docker context inspect "${candidate}" >/dev/null 2>&1; then
      target_context="${candidate}"
      break
    fi
  done
fi

if [[ -z "${target_context}" ]]; then
  echo "Missing Docker context. Set SMART_ADDRESS_LINUX_DOCKER_CONTEXT or pass a context name."
  echo "Example: SMART_ADDRESS_LINUX_DOCKER_CONTEXT=colima ./scripts/dev-full-linux.sh"
  exit 1
fi

current_context="$(docker context show)"

cleanup() {
  docker context use "${current_context}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "==> Switching Docker context to ${target_context}"
docker context use "${target_context}" >/dev/null

echo "==> Starting full Linux stack (LGTM + smart-address + Alloy eBPF)"
docker compose --profile ebpf \
  -f deploy/compose/obs.yaml \
  -f deploy/compose/app.yaml \
  -f deploy/compose/alloy.yaml up
