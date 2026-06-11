# ai-image — local GPU pattern generator

Turns a real photo of a wallpaper/floor product into clean product images using
**FLUX.1 Kontext [dev]** running locally on your GPU (RTX 4090, 24 GB).

- `flat` — flat, evenly-lit seamless pattern swatch (Flux removes perspective,
  folds, shadows, background)
- `roll` — that swatch composited onto a wallpaper roll (numpy, deterministic)

## 1. Setup (one time)

```powershell
cd "apps\ai-image"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. Get the model (gated, one time)

FLUX.1 Kontext dev needs a free HuggingFace license acceptance + token:

1. Accept the license: https://huggingface.co/black-forest-labs/FLUX.1-Kontext-dev
2. Create a token: https://huggingface.co/settings/tokens
3. Set it before first run:

```powershell
$env:HF_TOKEN = "hf_xxx"
```

First run downloads ~24 GB into the HuggingFace cache.

## 3. Run

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn service:app --host 0.0.0.0 --port 8500
```

Health check: http://localhost:8500/health

`LOW_VRAM=1` switches to sequential CPU offload for cards under ~16 GB
(slower). The 4090 should use the default (model CPU offload).

## 4. API

```
POST /generate-pattern
{ "image": "<base64 or data URL>", "category": "обой", "seed": 42 }

→ { "flat": "data:image/jpeg;base64,...", "roll": "data:image/jpeg;base64,..." }
```

`roll` is only returned for roll-like categories (обой, ламинат).

```
POST /edit-product-photo
{ "image": "<base64 or data URL>", "output_size": 900, "processing_mode": "simple" }

→ { "image": "data:image/jpeg;base64,..." }
```

This endpoint crops the estimated main object, centers it on a white square
background, and normalizes common phone-camera shadows for product photos.
`processing_mode: "simple"` uses BiRefNet foreground segmentation when available
and adds the bottom `logo.jpg` mark as white text with a black outline.
`processing_mode: "ai"` keeps the previous cleanup behavior without adding the
logo.

## Production note

The app calls this service via `GPU_SERVICE_URL` (see `apps/web`). EC2 has no GPU,
so in production either expose this machine through a tunnel (Cloudflare
Tunnel / Tailscale) or point `GPU_SERVICE_URL` at a cloud GPU (e.g. RunPod).
