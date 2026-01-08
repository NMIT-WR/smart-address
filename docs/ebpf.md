# eBPF runbook (Linux)

## Goal
Run Beyla eBPF metrics (and optional traces) for smart-address on Linux using Alloy + LGTM.

## Prerequisites
- Linux kernel >= 5.8 with BTF enabled.
- Docker engine running on the Linux host or VM.
- This repo with `deploy/compose/obs.yaml`, `deploy/compose/app.yaml`, and `deploy/compose/alloy.yaml`.

## Inputs
- Optional: `SMART_ADDRESS_BEYLA_OTLP_ENDPOINT` to override the OTLP target for Beyla traces (default is `lgtm:4317`).
- Optional: edit `deploy/alloy/config.alloy` and include `traces` in `exports` to enable Beyla spans.

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
- Grafana shows Beyla RED + network metrics (Prometheus data source).
- Optional: Beyla spans appear in Tempo when `exports` includes `traces`.

## Errors
- `FAIL: Linux required`: run the stack in a Linux VM or Proxmox VM (macOS host cannot run eBPF).
- `BTF missing`: upgrade the kernel or enable BTF (`/sys/kernel/btf/vmlinux` must exist).
- `Docker daemon not reachable`: start Docker or fix permissions.

## See also
- `scripts/ebpf-preflight.sh`
- `deploy/alloy/config.alloy`
