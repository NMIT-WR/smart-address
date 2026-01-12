#!/usr/bin/env bash
# shellcheck shell=bash

wait_for_url() {
  local url="${1:-}"
  local attempts="${2:-30}"
  local i=1

  if [[ -z "${url}" ]]; then
    echo "wait_for_url: missing url" >&2
    return 2
  fi

  if ! [[ "${attempts}" =~ ^[0-9]+$ ]] || [[ "${attempts}" -lt 1 ]]; then
    echo "wait_for_url: attempts must be a positive integer" >&2
    return 2
  fi

  if ! command -v curl >/dev/null 2>&1; then
    echo "wait_for_url: curl not available" >&2
    return 127
  fi

  while [[ "${i}" -le "${attempts}" ]]; do
    if curl -fsS --connect-timeout 2 --max-time 4 "${url}" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    if [[ "${i}" -le "${attempts}" ]]; then
      sleep 1
    fi
  done
  return 1
}
