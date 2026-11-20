#!/usr/bin/env bash
# Outshark / ReClip safe recovery utility
# Run on the Oracle Ubuntu host. No public access or firewall changes.
set -Eeuo pipefail
umask 077
SERVICE="${SERVICE:-outshark-reclip.service}"
LOCAL_URL="${LOCAL_URL:-http://127.0.0.1:8899/}"
STATE_DIR="${STATE_DIR:-/var/lib/outshark-recovery}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-900}"
MAX_RESTARTS_PER_DAY="${MAX_RESTARTS_PER_DAY:-3}"
ACTION="${1:-status}"
die(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }
active(){ systemctl is-active --quiet "$SERVICE"; }
health(){
  # The root handler can return 400 from URL validation.
  # A missing job should return JSON with "Job not found" and HTTP 404.
  local response status body
  response="$(curl --silent --show-error --max-time 8 --write-out 'HTTP_CODE:%{http_code}' "${LOCAL_URL}api/status/0000000000" 2>/dev/null)" || return 1
  status="${response##*HTTP_CODE:}"
  body="${response%HTTP_CODE:*}"
  [[ "$status" == "404" ]] && [[ "$body" == *'Job not found'* ]]
}

check_config(){
  [[ "$SERVICE" == "outshark-reclip.service" ]] || die "Unexpected service name"
  [[ "$LOCAL_URL" == "http://127.0.0.1:8899/" ]] || die "Unexpected health URL"
  [[ "$MAX_RESTARTS_PER_DAY" =~ ^[0-9]+$ ]] || die "Invalid daily limit"
  [[ "$COOLDOWN_SECONDS" =~ ^[0-9]+$ ]] || die "Invalid cooldown"
}
status(){
  printf 'Service: '; systemctl is-active "$SERVICE" || true
  printf 'Local health: '; if health; then echo OK; else echo FAILED; fi
  printf 'Disk: '; df -h / | tail -n 1
  printf 'Memory: '; free -h | grep '^Mem:' || true
  printf 'API exposure (expect loopback only):\n'
  ss -lnt | grep -E '(:8899)[[:space:]]' || true
  printf 'Public launch: NOT changed by recovery utility\n'
}
recover(){
  [[ "$(id -u)" -eq 0 ]] || die "Use sudo for recovery"
  command -v flock >/dev/null || die "flock is required"
  install -d -m 0700 "$STATE_DIR"
  exec 9>"$STATE_DIR/recovery.lock"
  flock -n 9 || die "Recovery already running"
  if active && health; then echo "Healthy; no restart needed"; return 0; fi
  local today now last count
  today="$(date -u +%F)"; now="$(date +%s)"
  last=0; count=0
  [[ -f "$STATE_DIR/last_restart" ]] && read -r last < "$STATE_DIR/last_restart"
  [[ "$last" =~ ^[0-9]+$ ]] || last=0
  if [[ -f "$STATE_DIR/count" ]]; then
    local d c; read -r d c < "$STATE_DIR/count" || true
    if [[ "${d:-}" == "$today" && "${c:-}" =~ ^[0-9]+$ ]]; then count="$c"; fi
  fi
  (( now-last >= COOLDOWN_SECONDS )) || die "Cooldown active; inspect logs"
  (( count < MAX_RESTARTS_PER_DAY )) || die "Daily restart limit reached; investigate root cause"
  echo "Restarting $SERVICE (existing service only)..."
  systemctl cat "$SERVICE" >/dev/null || die "Service not installed"
  systemctl restart "$SERVICE"
  printf '%s\n' "$now" > "$STATE_DIR/last_restart"
  printf '%s %s\n' "$today" "$((count+1))" > "$STATE_DIR/count"
  sleep 3
  active && health || die "Restart did not restore local health; see journalctl -u $SERVICE"
  echo "Service recovered locally. Public access remains blocked."
}
check_config
case "$ACTION" in
  status) status;;
  health) health && echo "Healthy" || die "Unhealthy";;
  recover) recover;;
  logs) journalctl -u "$SERVICE" -n 100 --no-pager;;
  *) echo "Usage: $0 {status|health|recover|logs}"; exit 2;;
esac
