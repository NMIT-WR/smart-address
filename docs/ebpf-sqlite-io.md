# SQLite I/O latency tracing (bpftrace)

## Goal

Inspect SQLite read/write and fsync latency spikes on Linux to help correlate slow I/O with request windows.

## Prerequisites

- Linux host/VM with eBPF support.
- `bpftrace` installed and root privileges.
- smart-address running in Docker.

## Inputs

- Target PID of the smart-address container.
- Optional latency threshold in milliseconds.

Find the container PID:

```bash
docker ps --format "table {{.Names}}\t{{.ID}}" | grep smart-address
docker inspect --format '{{.State.Pid}}' smart-address
```

Run the latency probes (examples with 10ms threshold):

```bash
sudo bpftrace deploy/ebpf-tools/io-latency.bt <PID> 10
```

```bash
sudo bpftrace deploy/ebpf-tools/fsync-latency.bt <PID> 10
```

Generate load:

```bash
curl -fsS "http://localhost:8787/suggest?q=Prague&limit=5&countryCode=CZ" >/dev/null
```

## Output

- Console lines showing `read`, `write`, `fsync`, and `fdatasync` latency in milliseconds.
- Correlate timestamps with request spans in Grafana.

## Errors

- If you see `bpftrace: command not found`, install `bpftrace` in the VM.
- If you see `permission denied`, run with `sudo` and ensure the kernel supports eBPF.

## See also

- `docs/ebpf.md`
