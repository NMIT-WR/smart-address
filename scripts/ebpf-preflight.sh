#!/usr/bin/env bash
set -euo pipefail

failures=0

pass() {
  echo "PASS: $1"
}

fail() {
  echo "FAIL: $1"
  failures=$((failures + 1))
}

os_name="$(uname -s)"
kernel_release="$(uname -r)"

if [[ "${os_name}" == "Linux" ]]; then
  pass "Linux detected (${kernel_release})."
else
  fail "Linux required for eBPF (detected ${os_name}). Use a Linux VM or Proxmox."
fi

kernel_version="${kernel_release%%-*}"
major="${kernel_version%%.*}"
minor="${kernel_version#*.}"
minor="${minor%%.*}"

if [[ "${major}" =~ ^[0-9]+$ && "${minor}" =~ ^[0-9]+$ ]]; then
  if (( major > 5 || (major == 5 && minor >= 8) )); then
    pass "Kernel version >= 5.8 (${major}.${minor})."
  else
    fail "Kernel version ${major}.${minor} is too old (need >= 5.8)."
  fi
else
  fail "Unable to parse kernel version from '${kernel_release}'."
fi

if [[ -e /sys/kernel/btf/vmlinux ]]; then
  pass "BTF present at /sys/kernel/btf/vmlinux."
else
  fail "BTF missing at /sys/kernel/btf/vmlinux (enable BTF or upgrade kernel)."
fi

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    pass "Docker daemon reachable."
  else
    fail "Docker daemon not reachable. Start Docker or check permissions."
  fi
else
  fail "Docker CLI not found. Install Docker."
fi

if [[ "${failures}" -gt 0 ]]; then
  echo "FAIL: eBPF preflight failed with ${failures} issue(s)."
  exit 1
fi

echo "PASS: eBPF preflight checks passed."
