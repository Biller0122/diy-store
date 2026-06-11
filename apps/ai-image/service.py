"""
Local GPU image service for DIY Store.

Takes a real photo of a wallpaper / floor product and produces two clean
product images using FLUX.1 Kontext (instruction image editing):

  1. flat  — a flat, evenly-lit, top-down seamless pattern swatch
  2. roll  — the swatch composited onto a cylindrical roll on white background
             (deterministic, done with numpy so the pattern stays exact)

Run:
    uvicorn service:app --host 0.0.0.0 --port 8500

Env:
    FLUX_MODEL       HuggingFace model id (default black-forest-labs/FLUX.1-Kontext-dev)
    HF_TOKEN         HuggingFace token (model is gated; accept license first)
    LOW_VRAM         "1" to use sequential CPU offload (slower, <16GB). Default
                     uses model CPU offload which fits comfortably on a 24GB card.
"""

import os

# Windows without Developer Mode/admin cannot create symlinks; make the HF cache
# copy files instead of symlinking (avoids WinError 1314). Must be set before
# huggingface_hub is imported.
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS", "1")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
# The Xet transfer backend stalls on this machine (0-byte .incomplete, frozen);
# force the standard, resumable HTTP downloader instead.
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

import base64
import io
from contextlib import asynccontextmanager

import numpy as np
import torch
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL_ID = os.environ.get("FLUX_MODEL", "black-forest-labs/FLUX.1-Kontext-dev")
LOW_VRAM = os.environ.get("LOW_VRAM", "0") == "1"

# Categories that should get the wallpaper/roll treatment.
ROLL_CATEGORIES = {"обой", "ламинат"}
FLAT_CATEGORIES = {"кафель", "паркет"}

SWATCH_PROMPT = (
    "Transform this into a flat, top-down, evenly lit seamless wallpaper pattern "
    "swatch. Remove all perspective, folds, curves, shadows, glare and background "
    "objects. Keep only the repeating surface pattern and its true colors, sharp "
    "and clean, as if scanned flat. Square, centered, studio lighting."
)

pipe = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global pipe
    from diffusers import FluxKontextPipeline

    token = os.environ.get("HF_TOKEN")
    pipe = FluxKontextPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.bfloat16,
        token=token,
    )
    if LOW_VRAM:
        pipe.enable_sequential_cpu_offload()
    else:
        pipe.enable_model_cpu_offload()
    pipe.set_progress_bar_config(disable=True)
    print(f"[ai-image] loaded {MODEL_ID} (low_vram={LOW_VRAM})", flush=True)
    yield
    pipe = None


app = FastAPI(lifespan=lifespan)


# ── image helpers ────────────────────────────────────────────────────────

def decode_image(value: str) -> Image.Image:
    if "," in value and value.strip().startswith("data:"):
        value = value.split(",", 1)[1]
    raw = base64.b64decode(value)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def encode_image(img: Image.Image, fmt: str = "JPEG", quality: int = 90) -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def make_seamless(img: Image.Image) -> Image.Image:
    """Cheap offset-blend to reduce visible seams when tiling the swatch."""
    arr = np.asarray(img.convert("RGB")).astype(np.float32)
    h, w = arr.shape[:2]
    bw = max(8, w // 12)
    bh = max(8, h // 12)
    # blend right edge over left, bottom over top
    for i in range(bw):
        a = i / bw
        arr[:, i] = arr[:, i] * a + arr[:, w - bw + i] * (1 - a)
    for i in range(bh):
        a = i / bh
        arr[i, :] = arr[i, :] * a + arr[h - bh + i, :] * (1 - a)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def make_roll(swatch: Image.Image, out_w: int = 560, out_h: int = 760) -> Image.Image:
    """Composite the seamless swatch onto a vertical cylinder (a wallpaper roll)."""
    roll_w = int(out_w * 0.46)
    tile = swatch.resize((roll_w, roll_w), Image.LANCZOS)

    reps = out_h // roll_w + 1
    strip = Image.new("RGB", (roll_w, roll_w * reps))
    for i in range(reps):
        strip.paste(tile, (0, i * roll_w))
    strip = strip.crop((0, 0, roll_w, out_h))

    arr = np.asarray(strip).astype(np.float32)

    # cylindrical horizontal remap: compress columns toward the edges
    xs = np.linspace(-1.0, 1.0, roll_w)
    src = np.arcsin(np.clip(xs, -1, 1)) / (np.pi / 2.0)  # -1..1, dense at edges
    src_idx = np.clip(((src + 1) / 2 * (roll_w - 1)).astype(np.int32), 0, roll_w - 1)
    warped = arr[:, src_idx, :]

    # soft shading: brightest at center, darker at the rounded edges
    shade = np.clip(np.cos(xs * 1.15), 0.32, 1.0)
    # subtle specular highlight just left of center
    highlight = 0.18 * np.exp(-((xs + 0.25) ** 2) / 0.02)
    shade = np.clip(shade + highlight, 0.0, 1.05)[None, :, None]
    warped = np.clip(warped * shade, 0, 255).astype(np.uint8)
    roll = Image.fromarray(warped)

    canvas = Image.new("RGB", (out_w, out_h), (247, 247, 248))
    x0 = (out_w - roll_w) // 2

    # drop shadow under the roll
    shadow = Image.new("L", (out_w, out_h), 0)
    sa = np.asarray(shadow).copy()
    sx = np.clip(np.cos(xs * 1.15), 0, 1)
    sa[:, x0:x0 + roll_w] = (sx * 40).astype(np.uint8)[None, :]
    canvas.paste((225, 225, 228), (0, 0), Image.fromarray(sa))

    canvas.paste(roll, (x0, 0))
    return canvas


# ── api ──────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    image: str                 # base64 or data URL of the original photo
    category: str = "обой"     # AI/selected category (decides flat vs roll)
    seed: int | None = None


class GenerateResponse(BaseModel):
    flat: str                  # data URL — clean flat swatch
    roll: str | None = None    # data URL — roll mockup (wallpaper-like only)


@app.get("/health")
def health():
    return {"ok": pipe is not None, "model": MODEL_ID, "low_vram": LOW_VRAM}


@app.post("/generate-pattern", response_model=GenerateResponse)
def generate_pattern(req: GenerateRequest):
    if pipe is None:
        raise HTTPException(503, "model not loaded yet")

    try:
        source = decode_image(req.image)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"bad image: {exc}") from exc

    # keep input within Flux Kontext's sweet spot
    source.thumbnail((1024, 1024), Image.LANCZOS)

    generator = None
    if req.seed is not None:
        generator = torch.Generator(device="cpu").manual_seed(req.seed)

    result = pipe(
        image=source,
        prompt=SWATCH_PROMPT,
        guidance_scale=2.5,
        num_inference_steps=28,
        generator=generator,
    ).images[0]

    swatch = result.resize((768, 768), Image.LANCZOS)
    seamless = make_seamless(swatch)

    category = (req.category or "").strip().lower()
    roll = None
    if category in ROLL_CATEGORIES:
        roll = encode_image(make_roll(seamless))

    return GenerateResponse(flat=encode_image(seamless), roll=roll)
