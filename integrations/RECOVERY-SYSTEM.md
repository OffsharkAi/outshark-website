# Outshark Advanced Recovery System — staged implementation

This system monitors the public GitHub Pages site and gives the Oracle server operator a guarded, explicit local ReClip recovery command. It does **not** expose the downloader, change DNS, remove the Cloudflare WAF lock, or claim to be a completed disaster-recovery backup solution.

## Architecture

- `www.outshark.in`: GitHub Pages, unchanged. GitHub Actions checks it every 30 minutes (best effort; GitHub scheduled workflows can be delayed).
- `api.outshark.in`: launch-locked on Cloudflare; not included in public availability monitoring because its block is intentional.
- Oracle Ubuntu ReClip: localhost Gunicorn on 127.0.0.1:8899, systemd unit `outshark-reclip.service`. Manual operator-controlled recovery only.

## On the Oracle VM

Copy `integrations/server-recovery.sh` from this reviewed repository to the server and run:

```bash
bash server-recovery.sh status
bash server-recovery.sh logs
sudo bash server-recovery.sh recover
```

Recovery only restarts a failed/unhealthy existing local service, is serialized via flock, and has a 15-minute cooldown and a 3-restarts-per-UTC-day limit. The restart is **not** safe to run automatically until downloader sandbox and disk boundaries are verified. Check logs, disk pressure, and dependencies if restart fails.

## Backups & restore prerequisites

A reliable restore system needs an operator-configured **off-server encrypted backup destination**, tested backup/restore procedures, and stored infrastructure configuration. Never place SSH keys, downloaded user media, Cloudflare tokens, private database data, or secret environment variables in this repository. No automated backup is enabled by these files.

Recommended operational plan:
1. Back up relevant application source/configuration securely with versioning, excluding secrets and temporary downloaded media. Store secrets in a separate secure vault.
2. Take encrypted off-server recovery points with retention and integrity verification.
3. Restore to an isolated test VM, verify checksums and service health, then document the recovery procedure.
4. Monitor CPU/memory/disk pressure on the host separately; website HTTP success does not prove downloader health.

## Launch policy

See `integrations/ORACLE-DEPLOYMENT.md` for remaining blockers. Do not enable `api.outshark.in` or the frontend ReClip preview until SSRF network isolation, aggregate disk quotas, authorization, cross-origin design, and end-to-end validation pass. This utility does not fix those blockers.

## Operational limitations

- GitHub-hosted scheduled monitoring is not continuous and may miss short outages.
- Local service recovery cannot restore a lost VM, persistent data, expired TLS certificate, Cloudflare misconfiguration, or GitHub Pages outage.
- No automatic production change, firewall change, public API activation, automatic deployment, or proven full-site recovery is included.
