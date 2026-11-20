#!/usr/bin/env bash
# Outshark Oracle cleanup utility: deliberately narrow and non-disruptive.
# Default: preview only. --apply removes only >7-day-old partial/temp files.
set -Eeuo pipefail
umask 077
mode="${1:---dry-run}"
case "$mode" in --dry-run|--apply) ;; *) echo 'Usage: bash oracle-safe-clean.sh [--dry-run|--apply]' >&2; exit 2 ;; esac
dir="/home/ubuntu/reclip/downloads"
if [[ "$(id -u)" -eq 0 ]]; then
  echo 'Refusing root execution; connect as the ubuntu user.' >&2; exit 1
fi
if [[ ! -d "$dir" || -L "$dir" ]]; then
  echo 'Download directory absent or a symlink. Nothing changed.'; exit 0
fi
actual="$(realpath -e -- "$dir")"
[[ "$actual" == "$dir" ]] || { echo 'Unexpected download directory path; aborting.' >&2; exit 1; }
[[ -O "$dir" ]] || { echo 'Downloads not owned by current user; aborting.' >&2; exit 1; }
if pgrep -x yt-dlp >/dev/null || pgrep -x ffmpeg >/dev/null; then
  echo 'Downloader/FFmpeg process detected; cleanup skipped to protect active jobs.'; exit 0
fi
echo "Mode: $mode"
echo 'Directory disk use:'
du -sh -- "$dir"
echo 'Root filesystem:'
df -h -- "$dir"
echo 'Eligible temporary files (older than 7 days; finished media and source code are excluded):'
find -P "$dir" -maxdepth 1 -type f -mmin +10080 \( -name '*.part' -o -name '*.ytdl' -o -name '*.temp' -o -name '*.tmp' \) -printf '%f\n'
if [[ "$mode" == "--apply" ]]; then
  find -P "$dir" -maxdepth 1 -type f -mmin +10080 \( -name '*.part' -o -name '*.ytdl' -o -name '*.temp' -o -name '*.tmp' \) -delete
  echo 'Eligible stale temporary files removed. Finished downloads and configuration retained.'
else
  echo 'Dry run only. No files deleted. Use --apply after reviewing the filenames.'
fi
