#!/usr/bin/env bash
# Robust FLUX downloader: curl with resume + stall-abort + endless retry.
# Defeats silent connection stalls that hang huggingface_hub.
set -u

REPO="black-forest-labs/FLUX.1-Kontext-dev"
OUT="$(cd "$(dirname "$0")" && pwd)/models/flux-kontext"
TOKEN="$(cat "$HOME/.cache/huggingface/token" 2>/dev/null | tr -d '\r\n')"
LIST="$(dirname "$0")/needed_files.txt"

mkdir -p "$OUT"

while IFS= read -r f; do
  f="${f%$'\r'}"   # strip Windows CR
  [ -z "$f" ] && continue
  url="https://huggingface.co/${REPO}/resolve/main/${f}"
  dest="${OUT}/${f}"
  mkdir -p "$(dirname "$dest")"
  echo ">>> $f"
  # -C - resume; --speed-time/--speed-limit abort a stalled transfer (<80KB/s for 30s);
  # --retry + --retry-all-errors then retries and -C - resumes from disk.
  curl -L -C - \
    --retry 9999 --retry-all-errors --retry-delay 5 \
    --speed-limit 80000 --speed-time 30 \
    --connect-timeout 30 \
    -H "Authorization: Bearer ${TOKEN}" \
    --create-dirs -o "$dest" \
    "$url"
done < "$LIST"

echo "ALL FILES DONE -> $OUT"
