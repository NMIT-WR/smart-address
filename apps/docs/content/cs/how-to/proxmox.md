# Deploy na Proxmoxu (Docker VM)

## Cíl
Spustit Smart Address + LGTM + Alloy na Proxmox VM s perzistencí a restart politikami.

## Předpoklady
- Docker Engine a Docker Compose nainstalované ve VM.
- Otevřené porty: `3000` (Grafana), `8787` (služba), `4317/4318` (OTLP), `4040` (Pyroscope), `9090` (Prometheus UI).
- Volitelně API klíče (Radar/HERE).

## Vstupy
- Proměnné prostředí pro providery.
- `deploy/proxmox/compose.yaml`.

```bash
cd /path/to/smart-address
docker compose -f deploy/proxmox/compose.yaml up -d
```

## Výstup
- Perzistentní data v `deploy/proxmox/data/` pro LGTM, SQLite služby, Alloy stav a Pyroscope symboly.
- Služby se obnoví po restartu VM.

## Chyby
- Pokud chybí trace, ověřte OTLP porty `4317/4318`.
- Pokud nefungují provider volání, zkontrolujte API klíče ve VM.

## Viz také
- `/docs/proxmox.md`
- `/cs/how-to/ebpf`
