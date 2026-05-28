#!/usr/bin/env bash
set -euo pipefail

SWAP_FILE="${SWAP_FILE:-/swapfile}"
SWAP_SIZE="${SWAP_SIZE:-2G}"

if swapon --show=NAME | grep -qx "$SWAP_FILE"; then
  echo "Swap already active: $SWAP_FILE"
  exit 0
fi

if [ ! -f "$SWAP_FILE" ]; then
  sudo fallocate -l "$SWAP_SIZE" "$SWAP_FILE" || sudo dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048
  sudo chmod 600 "$SWAP_FILE"
  sudo mkswap "$SWAP_FILE"
fi

sudo swapon "$SWAP_FILE"

if ! grep -q "^$SWAP_FILE " /etc/fstab; then
  echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
fi

echo "Swap ready:"
swapon --show
