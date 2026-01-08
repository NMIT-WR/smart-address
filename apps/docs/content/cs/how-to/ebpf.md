# Linux eBPF observabilita (Beyla)

## Cíl
Sbírat eBPF RED + síťové metriky (a volitelně spany) pro službu smart-address na Linuxu.

## Předpoklady
- Linux kernel >= 5.8 s BTF (`/sys/kernel/btf/vmlinux`).
- Docker běžící na Linux hostu/VM (eBPF je pouze pro Linux).
- `deploy/compose/obs.yaml`, `deploy/compose/app.yaml`, `deploy/compose/alloy.yaml`.

## Vstupy
- Volitelně: `SMART_ADDRESS_BEYLA_OTLP_ENDPOINT` pro přepsání OTLP endpointu pro Beyla spany (výchozí `lgtm:4317`).
- Volitelně: upravte `deploy/alloy/config.alloy` a přidejte `traces` do `exports` pro zapnutí Beyla spanů.

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

## Výstup
- Grafana ukazuje Beyla RED + síťové metriky v Prometheus datasource.
- Pokud je zapnuto, Beyla spany se zobrazí v Tempo (odděleně od Effect trace).

## Chyby
- `FAIL: Linux required`: spusťte v Linux VM nebo Proxmox VM.
- `BTF missing`: aktualizujte kernel nebo zapněte BTF.
- `Docker daemon not reachable`: spusťte Docker nebo opravte oprávnění.

## Viz také
- `/docs/ebpf.md`
- `/cs/explanation/observability`
