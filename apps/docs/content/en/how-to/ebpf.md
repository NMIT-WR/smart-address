# Linux eBPF observability (Beyla)

## Goal

Collect eBPF RED + network metrics (and optional spans) plus CPU profiles for the smart-address service on Linux.

## Prerequisites

- Linux kernel >= 5.8 with BTF enabled (`/sys/kernel/btf/vmlinux`).
- Docker running on a Linux host/VM (eBPF is Linux-only).
- `deploy/compose/obs.yaml`, `deploy/compose/app.yaml`, `deploy/compose/alloy.yaml`.
- Alloy runs as root with host PID namespace and `/tmp/symb-cache` mounted.

## Inputs

- Optional: `SMART_ADDRESS_BEYLA_OTLP_ENDPOINT` to override the OTLP endpoint for Beyla traces (default `lgtm:4317`).
- Beyla spans are enabled by default. To disable them, remove `traces` from the `exports` list inside `beyla.ebpf` -> `discovery` -> `instrument` and delete the `traces {}` block.

```bash
./scripts/ebpf-preflight.sh
```

```bash
docker compose -f deploy/compose/obs.yaml \
  -f deploy/compose/app.yaml \
  -f deploy/compose/alloy.yaml up
```

```bash
curl -fsS "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ" >/dev/null
```

## Output

- Grafana shows Beyla RED + network metrics under the Prometheus data source.
- Pyroscope shows CPU profiles for `smart-address` after load.
- Beyla spans appear in Tempo (separate from Effect traces). Remove `traces` from `exports` and the `traces {}` block to disable them.

## Errors

- `FAIL: Linux required`: run in a Linux VM or Proxmox VM.
- `BTF missing`: upgrade the kernel or enable BTF.
- `Docker daemon not reachable`: start Docker or fix permissions.

## See also

- `/explanation/observability`
- `/how-to/ebpf-sqlite-io`
- `/how-to/dev-modes`
