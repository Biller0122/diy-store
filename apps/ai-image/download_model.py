"""Robust FLUX model downloader: hf_transfer + retry loop that resumes."""
import os
import time

os.environ.setdefault("HF_HUB_ENABLE_HF_TRANSFER", "1")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS", "1")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

from huggingface_hub import snapshot_download

REPO = os.environ.get("FLUX_MODEL", "black-forest-labs/FLUX.1-Kontext-dev")

for attempt in range(1, 31):
    try:
        print(f"[download] attempt {attempt} ...", flush=True)
        path = snapshot_download(REPO, max_workers=2)
        print(f"SNAPSHOT COMPLETE: {path}", flush=True)
        break
    except Exception as exc:  # noqa: BLE001
        print(f"[download] attempt {attempt} failed: {type(exc).__name__}: {str(exc)[:160]}", flush=True)
        time.sleep(5)
else:
    raise SystemExit("download failed after 30 attempts")
