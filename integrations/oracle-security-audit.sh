#!/usr/bin/env bash
# Outshark Oracle ReClip preflight: READ-ONLY. Never prints tunnel tokens.
set -u
fail=0
warn=0
ok(){ printf 'PASS: %s\n' "$*"; }
bad(){ printf 'BLOCKER: %s\n' "$*"; fail=$((fail+1)); }
note(){ printf 'CHECK: %s\n' "$*"; warn=$((warn+1)); }
echo 'Outshark ReClip deployment audit (read-only)'
echo '------------------------------------------'
if systemctl is-active --quiet cloudflared; then ok 'cloudflared running'; else bad 'cloudflared service not active'; fi
if systemctl is-active --quiet outshark-reclip; then ok 'reclip running'; else bad 'reclip service not active'; fi
if systemctl is-active --quiet outshark-cleanup.timer; then ok 'cleanup timer active'; else note 'cleanup timer not active'; fi
# Never output full service environment or command arguments (may include secrets).
if command -v ss >/dev/null; then
  if ss -H -ltn '( sport = :8899 )' | grep -Eq '127[.]0[.]0[.]1:8899|\[::1\]:8899'; then
    ok 'ReClip listens on a loopback address'
  else
    bad 'ReClip localhost port 8899 not verified'
  fi
  if ss -H -ltn '( sport = :8899 )' | grep -Eq '0[.]0[.]0[.]0:8899|\[::\]:8899|\*:8899'; then
    bad 'ReClip also listens on a public/wildcard interface'
  fi
fi
for prop in MemoryMax TasksMax LimitFSIZE; do
  value="$(systemctl show outshark-reclip -p "$prop" --value 2>/dev/null || true)"
  case "$value" in
    ''|infinity|18446744073709551615|0) bad "$prop is not bounded" ;;
    *) ok "$prop set" ;;
  esac
done
if systemctl show outshark-reclip -p IPAddressDeny --value 2>/dev/null | grep -q '169.254'; then
  ok 'systemd link-local network-deny rule present'
else
  bad 'No confirmed systemd link-local network-deny rule'
fi
if [ -e /home/ubuntu/reclip/app.py ]; then
  ok 'ReClip source exists'
else
  bad 'ReClip source not found at expected path'
fi
# These cannot be safely inferred from service state. Keep them as blockers.
bad 'Download subprocess sandbox and redirect/DNS-rebinding SSRF protection need independent validation'
bad 'Aggregate disk quota for downloads and ffmpeg intermediates not verified'
bad 'Durable anti-abuse controls and job authorization not verified'
bad 'API CORS/HTTPS end-to-end tests not completed'
echo '------------------------------------------'
printf 'Blockers: %s; checks needing attention: %s\n' "$fail" "$warn"
echo 'RESULT: NOT APPROVED FOR PUBLIC DOWNLOADS'
exit 0
