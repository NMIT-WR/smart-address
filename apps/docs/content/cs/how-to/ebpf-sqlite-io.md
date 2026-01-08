# SQLite I/O latence (bpftrace)

## Cíl

Zjistit latency čtení/zápisu SQLite a fsync špičky na Linuxu a propojit je s časem requestů.

## Předpoklady

- Linux host/VM s podporou eBPF.
- Nainstalovaný `bpftrace` a root oprávnění.
- smart-address běží v Dockeru.

## Vstupy

- PID kontejneru smart-address.
- Volitelný práh latence v milisekundách.

Najděte PID kontejneru:

```bash
docker ps --format "table {{.Names}}\t{{.ID}}" | grep smart-address
docker inspect --format '{{.State.Pid}}' smart-address
```

Spusťte latency sondy (příklad s prahem 10 ms):

```bash
sudo bpftrace deploy/ebpf-tools/io-latency.bt <PID> 10
```

```bash
sudo bpftrace deploy/ebpf-tools/fsync-latency.bt <PID> 10
```

Vygenerujte zátěž:

```bash
curl -fsS "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ" >/dev/null
```

## Výstup

- Řádky v konzoli s latencí `read`, `write`, `fsync`, `fdatasync` v milisekundách.
- Korelujte čas s request spany v Grafaně.

## Chyby

- `bpftrace: command not found`: nainstalujte `bpftrace` ve VM.
- `permission denied`: použijte `sudo` a ověřte podporu eBPF.

## Viz také

- `/docs/ebpf-sqlite-io.md`
- `/cs/how-to/ebpf`
