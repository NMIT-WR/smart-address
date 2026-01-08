# Deploy on Proxmox (Docker VM)

## Goal
Run Smart Address + LGTM + Alloy on a Proxmox VM with persistent storage and restart policies.

## Prerequisites
- Docker Engine and Docker Compose installed in the VM.
- Open VM ports: `3000` (Grafana), `8787` (service), `4317/4318` (OTLP), `4040` (Pyroscope), `9090` (Prometheus UI).
- Optional provider API keys (Radar/HERE).

## Inputs
- Environment variables for providers.
- `deploy/proxmox/compose.yaml`.

```bash
cd /path/to/smart-address
docker compose -f deploy/proxmox/compose.yaml up -d
```

## Output
- Persistent data in `deploy/proxmox/data/` for LGTM, smart-address SQLite, Alloy state, and Pyroscope symbols.
- Services restart after VM reboot.

## Errors
- If traces are missing, verify OTLP ports `4317/4318`.
- If provider calls fail, confirm API keys are set in the VM environment.

## See also
- `/docs/proxmox.md`
- `/how-to/ebpf`
