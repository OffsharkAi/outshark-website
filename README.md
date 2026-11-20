# Outshark.in — production website

Public website: https://www.outshark.in/  
Source: https://github.com/OffsharkAi/outshark-website

## Hosting

- GitHub Pages deploys the `main` branch at `www.outshark.in` (see `CNAME`).
- The 14 listed browser tools run client-side. See `assets/tools.js` for the definitive catalogue.
- The direct-video-file saver is browser-based and works only when a source permits cross-origin access.
- The ReClip server-backed downloader is an **unlisted, disabled preview**. It is not included among the 14 working tools. See `integrations/ORACLE-DEPLOYMENT.md`.
- `api.outshark.in` remains blocked by a Cloudflare launch safety rule and the tunnel's 404 fallback. Never remove these controls just to make the preview clickable.

## Quality checks

- `node scripts/check-site.mjs` checks markup, file references, JavaScript syntax, catalogue entries and ReClip safety gate.
- `node scripts/monitor-production.mjs` checks that the homepage and listed tool pages respond over HTTPS.
- `node scripts/browser-smoke.mjs` uses Playwright (Chromium, Firefox and WebKit) for representative interactions. It requires Playwright and its browser binaries.
- GitHub Actions runs static, uptime and browser smoke checks on pushes; the uptime check also runs periodically.
- Passing automated smoke tests does not guarantee that every browser, large input, codec or network source will work.

## Maintenance

- `integrations/oracle-security-audit.sh`: read-only Oracle security audit.
- `integrations/oracle-safe-clean.sh`: preview or remove only 7-day-old temporary/partial download files after checking no yt-dlp/FFmpeg process is running. Does not delete completed media, system caches, SSH keys, tokens or app configuration.
- `integrations/server-recovery.sh`: guarded, **manual** Oracle service recovery; not installed or run automatically by this repository.
- None of these scripts grants this GitHub repository SSH access to Oracle. Run only after reviewing on the server using Termius.

## Privacy and publishing

Keep secrets and user media off GitHub. The site itself is static, but browser support for local media exports varies. Review contact, privacy and terms content as the site evolves. Do not publish ReClip until the required network isolation, quotas, abuse controls, HTTPS and delivery tests have passed.

## Local preview

Run `python -m http.server 8000` in the repository root and open `http://localhost:8000/`.
