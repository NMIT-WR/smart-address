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
- Optional: edit `deploy/alloy/config.alloy` and add `traces` to `exports` to enable Beyla spans.

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
- If enabled, Beyla spans appear in Tempo (separate from Effect traces).

## Errors
- `FAIL: Linux required`: run in a Linux VM or Proxmox VM.
- `BTF missing`: upgrade the kernel or enable BTF.
- `Docker daemon not reachable`: start Docker or fix permissions.

## See also
- `/docs/ebpf.md`
- `/explanation/observability`
- `/how-to/ebpf-sqlite-io`
