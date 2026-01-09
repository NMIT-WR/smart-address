# Proxmox deployment (Docker in VM)

## Goal

Run Smart Address + LGTM + Alloy on a Proxmox VM with persistent storage and restart policies.

## Prerequisites

- Docker Engine and Docker Compose installed in the VM.
- Open ports to the VM: `3000` (Grafana), `8787` (service), `4317/4318` (OTLP), `4040` (Pyroscope), `9090` (Prometheus UI).
- Optional provider API keys (Radar/HERE).

## Inputs

- Environment variables for providers (see `apps/docs/content/en/reference/config`).
- Compose file: `deploy/proxmox/compose.yaml`.

```bash
cd /path/to/smart-address
docker compose -f deploy/proxmox/compose.yaml up -d
```

## Output

- Persistent data in `deploy/proxmox/data/`:
  - `lgtm/` for Grafana/Tempo/Loki/Prometheus/Pyroscope data
  - `smart-address/` for SQLite cache + logs
  - `alloy/` for Alloy state
  - `symb-cache/` for Pyroscope symbols
- Services restart automatically after VM reboot.

## Errors

- If Grafana is reachable, but traces are missing, verify OTLP ports `4317/4318`.
- If provider calls fail, confirm API keys are set in the VM environment.

## See also

- `deploy/proxmox/compose.yaml`
- `docs/ebpf.md`
