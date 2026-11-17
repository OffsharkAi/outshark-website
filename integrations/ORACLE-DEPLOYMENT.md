# Oracle deployment security gate — Outshark ReClip

Status: **NOT APPROVED FOR PUBLIC TRAFFIC**. These instructions describe a deployment review; they are not evidence that the server has passed it.

## Cloudflare staging completed (2026-11-17)

- Cloudflare reports `outshark.in` zone active, account on Free Website plan.
- Connected remotely managed tunnel `outshark-oracle-reclip` is healthy (4 connections).
- Created proxied `api.outshark.in` CNAME to tunnel `42181045-e2f9-4f3e-a3e7-09ae970d8ceb.cfargotunnel.com`.
- Verified tunnel ingress is **only** `http_status:404`. Do not change this until every production blocker passes.
- Created read-only audit script `integrations/oracle-security-audit.sh` for the server operator. Run with a local shell, review blockers before enabling anything.
- Cloudflare DNS and tunnel configuration verified via API. HTTPS availability from an independent external client has **not** yet been confirmed (initial external DNS lookup failed).

## Current architecture (as observed 2026-11-17)

- Public static website: GitHub Pages, canonical URL `https://www.outshark.in/`.
- Oracle VM: Ubuntu 24.04 aarch64, ReClip Gunicorn bound to `127.0.0.1:8899`, user `ubuntu`.
- Local checks have returned HTTP 200, and a simulated single-process concurrent download test returned HTTP 503 for the second request.
- A 2-hour cleanup timer, Flask-Limiter, a 100 MB yt-dlp flag, and systemd resource limits were configured during manual SSH administration.
- Systemd `IPAddressDeny` was set on `outshark-reclip.service` for RFC1918, link-local, CGNAT, and some IPv6 private ranges. This is **not** a complete SSRF boundary.
- No durable total-disk quota, sandboxed per-job downloader, or public HTTPS endpoint has been verified.
- The unlisted frontend preview remains disabled by the empty `assets/reclip-config.js` setting. **Do not set a nonempty API base or include the preview in the public catalogue yet.**

## Critical findings

1. **Same-origin routing is currently impossible without changing the hosting architecture.** GitHub Pages cannot proxy `/reclip-api` to Oracle. A hostname such as `api.outshark.in` is cross-origin from `www.outshark.in`; the existing client explicitly rejects cross-origin API bases. Don't turn it on by changing the config alone.
2. **SSRF:** Initial Flask URL domain validation is not adequate. yt-dlp can follow redirects, resolve hostnames after initial validation, and fetch secondary manifests/media from other hosts. Loopback (`127.0.0.0/8` and `::1/128`) remains available to the app for DNS and the local API. A DNS stub at `127.0.0.53` is used. Downloaders must be isolated from loopback except an explicitly designed DNS path, the metadata endpoint, and internal/private IP space across IPv4 and IPv6.
3. **Resource exhaustion:** `--max-filesize 100M` is not a reliable aggregate disk cap; FFmpeg can generate intermediate files and concurrent/partial files remain. `LimitFSIZE=200M` limits individual file writes, not total output. The cleanup timer deletes old top-level files only and can delete still-active temporary files.
4. **Abuse and authorization:** The service currently accepts unauthenticated requests. Local in-memory Flask rate limiting and a `BoundedSemaphore(1)` in one Gunicorn process are not sufficient for an openly accessible paid-bandwidth/download service. Real client IP forwarding and proxy trust need explicit configuration. Job IDs are only 10 hex chars; predictable/brute-forced sharing risk should be considered when serving files. No public logging/privacy/retention model has been verified.
5. **Deployment security:** Never expose `8899` publicly. A TLS proxy must enforce method/path allowlists, request sizes, timeouts, response headers, origin checks, and controlled egress; avoid enabling permissive wildcard CORS.

## Proposed deployment topology

Keep `www.outshark.in` on GitHub Pages. Deploy a **separate HTTPS API hostname** (for example `api.outshark.in`) through an explicitly configured secure reverse proxy or Cloudflare Tunnel. If using a tunnel, ensure its public route is never added until API access controls and isolation are reviewed; a tunnel makes the backend reachable publicly, it does not supply application authorization. Keep its origin target `http://127.0.0.1:8899`. Do not use a publicly open Oracle ingress rule on port 8899.

The frontend will require a separately reviewed cross-origin client/endpoint design (or moving the entire site behind a reverse proxy to support true same-origin). CORS is *not* an authentication mechanism; it does not stop other clients or scripted abuse.

## Required checks before enablement

- [ ] Obtain DNS administration access and confirm the existing `www` GitHub Pages mapping and HTTPS are healthy. Do not overwrite `www` DNS to point at Oracle.
- [ ] Choose secure architecture (true same-origin reverse proxy **or** cross-origin `api` hostname with explicit frontend and CORS changes); validate certificate renewal.
- [ ] Run yt-dlp/FFmpeg in a **separate unprivileged user and sandboxed process** with no SSH keys, no sudo, minimal filesystem access, independent network policy and resource quotas.
- [ ] Prove the downloader can reach selected public hosts but fails to connect to loopback, IPv4/IPv6 private networks, metadata endpoints, and local Oracle internal services; test redirects, DNS rebinding, and media subrequests. Protect DNS while keeping loopback inaccessible to untrusted fetches.
- [ ] Apply a hard aggregate disk-use bound (isolated filesystem or quota, including temporary output), and handle cleanup without interrupting active jobs.
- [ ] Use shared durable rate limiting/queue limits, strict request validation, an authorization or anti-abuse policy, large random job identifiers, short expiry, and downloadable artifact access controls.
- [ ] Run end-to-end tests over HTTPS with authorized sample content, plus response header, CORS, CSRF/origin, error-handling and concurrency tests.
- [ ] Monitor disk, CPU, memory, bandwidth, job duration, errors, and account costs. Validate platform terms, copyright/license, and download policies.
- [ ] Only after all tests pass, update the preview, document limitations, and publish the tool in the catalogue/sitemap.

## Existing server checks (read-only)

```bash
systemctl is-active outshark-reclip
systemctl show outshark-reclip -p IPAddressDeny -p MemoryMax -p TasksMax -p LimitFSIZE --no-pager
systemctl is-active outshark-cleanup.timer
ss -lntp | grep ':8899'
curl -sS --max-time 10 -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:8899/
```

Do not change the VM's instance-wide firewall or SSH access during deployment without an out-of-band recovery path. Do not enter cloud credentials, SSH private keys, API tokens or tunnel tokens into the public repository or screenshots.

## Public readiness

**Fail closed**: The GitHub Pages integration preview stays disabled. Server-side validation, sandboxing, and public abuse controls need further implementation and independent verification before a deployment announcement.
