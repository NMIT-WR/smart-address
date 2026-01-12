# Dev módy (rychlý vs plný Linux)

## Cíl

Spustit Smart Address lokálně ve dvou režimech: rychlý macOS vývoj a plná Linux eBPF observabilita.

## Předpoklady

- Rychlý režim: Docker + Bun + pnpm na Macu.
- Plný režim: Linux Docker kontext (Colima/Lima/Proxmox) s podporou eBPF.

## Vstupy

- Volitelně: `SMART_ADDRESS_LINUX_DOCKER_CONTEXT` pro výběr Linux Docker kontextu.

## Použití

**Rychlý režim** — LGTM v Dockeru, služba na hostu:

```bash
./scripts/dev-fast.sh
```

**Plný režim** — Linux VM, služba + LGTM + Alloy eBPF v Dockeru:

```bash
SMART_ADDRESS_LINUX_DOCKER_CONTEXT=colima ./scripts/dev-full-linux.sh
```

## Výstup

- Rychlý režim: Grafana na `http://localhost:3000`, trace v Tempo, lokální Bun logy.
- Plný režim: Beyla metriky, Pyroscope profily a služba v Dockeru.

## Chyby

- `Missing Docker context`: nastavte `SMART_ADDRESS_LINUX_DOCKER_CONTEXT` nebo předejte název kontextu.
- Pokud eBPF selže, spusťte `./scripts/ebpf-preflight.sh` uvnitř Linux VM.

## Viz také

- `/cs/how-to/ebpf`
- `/cs/how-to/proxmox`
