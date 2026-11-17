# ReClip integration for Outshark

Upstream: https://github.com/averygan/reclip

## Evaluation (2026-11-16)

ReClip is an MIT-licensed Flask application using yt-dlp and FFmpeg. The upstream app supplies:
- POST /api/info with {url}; returns title, available format IDs and height-based labels.
- POST /api/download with {url, format: "video"|"audio", format_id, title}; returns job_id.
- GET /api/status/<job_id>; returns downloading/done/error, filename and error where applicable.
- GET /api/file/<job_id>; returns the resulting media file.

Upstream currently does **not** supply accurate per-job percentage progress. Do not show fake percentages.

## Why this cannot run in GitHub Pages

Outshark is currently served by GitHub Pages (static HTML, CSS, JavaScript). ReClip depends on a running Python web server, yt-dlp, FFmpeg, disk space and network egress. GitHub Actions is not suitable as a permanent public video download backend.

The page `tools/reclip-integration.html` is an **unlisted preview**; its controls remain disabled unless `assets/reclip-config.js` explicitly sets `OUTSHARK_RECLIP_ENABLED = true` and an HTTPS `https://api.outshark.in` base. Neither is set for production. It must NOT be represented as a working tool in the public catalogue or sitemap.

## Running upstream locally

Review its README, license and code, then follow upstream instructions for a trusted local machine:

```bash
git clone https://github.com/averygan/reclip.git
cd reclip
./reclip.sh
```

The upstream default binds to localhost on port 8899. That is separate from the public Outshark site.

**Oracle deployment/security review:** [ORACLE-DEPLOYMENT.md](ORACLE-DEPLOYMENT.md). This is a fail-closed gate: the live VM remains private, and the preview must not be enabled just because it returns HTTP 200.

## Production integration gate

Before publishing any backend:
1. Deploy an HTTPS-capable application server capable of running Python, yt-dlp and FFmpeg, with sustainable CPU, network and disk quotas. This may incur costs.
2. For the GitHub Pages architecture, use a dedicated HTTPS API at `https://api.outshark.in` with a strict `Access-Control-Allow-Origin: https://www.outshark.in` policy, no wildcard origin and an independent authentication/abuse-control layer. CORS alone is not authorization. Alternatively move the whole site behind a trusted reverse proxy for same-origin routes. Do not point the public site to an untrusted download service.
3. Review and harden upstream against SSRF, cloud metadata access, arbitrary internal host URLs, DNS rebinding, excessive redirects, and unauthenticated download abuse.
4. Enforce authentication or abuse controls, concurrency limits, duration/size limits, maximum disk use, automatic job/file cleanup and timeouts.
5. Avoid placing raw downloads or secrets in a public GitHub repository. Respect platform terms and user authorization.
6. Test supported platforms and formats. Remote sites can stop working when extractors change; never promise universal availability.
7. Add a genuine progress callback (e.g. yt-dlp progress hooks persisted per job) if you want measured percentages. Upstream status alone cannot provide them.
8. Configure the explicit production feature flag and API base only after the secured HTTPS API is deployed, and verify the cross-origin endpoint, CORS policy, request abuse controls and file delivery. ReClip's upstream frontend/API do not have the necessary public deployment protections by default.
9. Keep MIT attribution and full upstream license with any reused upstream code.

## License

Upstream license: https://github.com/averygan/reclip/blob/main/LICENSE — MIT, Copyright (c) 2026. This integration adapter is newly written for Outshark; it does not vendor or copy the upstream server code. If upstream code is copied, include its copyright and permission notice.
