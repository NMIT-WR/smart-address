# Dev modes (fast vs full Linux)

## Goal
Run Smart Address locally in two modes: fast macOS development and full Linux eBPF observability.

## Prerequisites
- Fast mode: Docker + Bun + pnpm on your Mac.
- Full mode: Linux Docker context (Colima/Lima/Proxmox) with eBPF support.

## Inputs
- Optional: `SMART_ADDRESS_LINUX_DOCKER_CONTEXT` to select the Linux Docker context.

Fast mode (LGTM in Docker, service on host):

```bash
./scripts/dev-fast.sh
```

Full mode (Linux VM, service + LGTM + Alloy eBPF in Docker):

```bash
SMART_ADDRESS_LINUX_DOCKER_CONTEXT=colima ./scripts/dev-full-linux.sh
```

## Output
- Fast mode: Grafana at `http://localhost:3000`, traces in Tempo, local Bun logs.
- Full mode: Beyla metrics, Pyroscope profiles, and Dockerized service.

## Errors
- `Missing Docker context`: set `SMART_ADDRESS_LINUX_DOCKER_CONTEXT` or pass a context name.
- If eBPF fails, run `./scripts/ebpf-preflight.sh` inside the Linux VM.

## See also
- `/how-to/ebpf`
- `/docs/ebpf.md`
