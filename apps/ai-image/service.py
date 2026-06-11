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
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
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
birefnet = None
BirefNetTransform = None
BirefNetToPIL = None
BirefNetDevice = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global pipe, birefnet, BirefNetTransform, BirefNetToPIL, BirefNetDevice
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

    if os.environ.get("LOAD_BIREFNET", "1") == "1":
        try:
            from torchvision import transforms
            from transformers import AutoModelForImageSegmentation

            model_id = os.environ.get("BIREFNET_MODEL", "ZhengPeng7/BiRefNet")
            BirefNetDevice = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            birefnet = AutoModelForImageSegmentation.from_pretrained(
                model_id,
                trust_remote_code=True,
                token=token,
            )
            birefnet.to(BirefNetDevice)
            birefnet.eval()
            BirefNetTransform = transforms.Compose(
                [
                    transforms.Resize((1024, 1024)),
                    transforms.ToTensor(),
                    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
                ]
            )
            BirefNetToPIL = transforms.ToPILImage()
            print(f"[ai-image] loaded {model_id} on {BirefNetDevice}", flush=True)
        except Exception as exc:  # noqa: BLE001
            birefnet = None
            BirefNetTransform = None
            BirefNetToPIL = None
            BirefNetDevice = None
            print(f"[ai-image] BiRefNet unavailable, falling back to color mask: {exc}", flush=True)
    yield
    pipe = None
    birefnet = None


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


class EditProductPhotoRequest(BaseModel):
    image: str                 # base64 or data URL of the original photo
    output_size: int = 900
    processing_mode: str = "ai"  # "simple" uses BiRefNet + logo; "ai" keeps cleanup only


class EditProductPhotoResponse(BaseModel):
    image: str                 # data URL — product centered on white background


@app.get("/health")
def health():
    return {
        "ok": pipe is not None,
        "model": MODEL_ID,
        "low_vram": LOW_VRAM,
        "birefnet": birefnet is not None,
    }


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


def product_foreground_mask(img: Image.Image) -> Image.Image:
    """Estimate the main product mask from edge/background color differences."""
    small = img.copy()
    small.thumbnail((900, 900), Image.LANCZOS)
    arr = np.asarray(small.convert("RGB")).astype(np.float32)
    h, w = arr.shape[:2]
    edge = max(8, min(h, w) // 18)

    samples = np.concatenate(
        [
            arr[:edge].reshape(-1, 3),
            arr[-edge:].reshape(-1, 3),
            arr[:, :edge].reshape(-1, 3),
            arr[:, -edge:].reshape(-1, 3),
        ],
        axis=0,
    )
    bg = np.median(samples, axis=0)
    distance = np.linalg.norm(arr - bg[None, None, :], axis=2)

    # Pick a conservative threshold from the current photo, with a floor for
    # white/light products on white-ish backgrounds.
    threshold = max(24.0, float(np.percentile(distance, 78)))
    mask = distance > threshold

    # Add saturated or dark details, useful for labels/logos on white products.
    maxc = arr.max(axis=2)
    minc = arr.min(axis=2)
    saturation = maxc - minc
    brightness = arr.mean(axis=2)
    mask |= (saturation > 34) & (distance > 12)
    mask |= (brightness < 180) & (distance > 18)

    # Keep the largest connected-ish visual region by growing/filling the mask
    # with PIL filters. This is deliberately dependency-light for deployment.
    mask_img = Image.fromarray((mask.astype(np.uint8) * 255), "L")
    mask_img = mask_img.filter(ImageFilter.MaxFilter(13))
    mask_img = mask_img.filter(ImageFilter.MinFilter(9))
    mask_img = mask_img.filter(ImageFilter.GaussianBlur(2.0))
    mask_img = mask_img.point(lambda p: 255 if p > 32 else 0)
    return mask_img.resize(img.size, Image.LANCZOS)


def birefnet_foreground_mask(img: Image.Image) -> Image.Image | None:
    if birefnet is None or BirefNetTransform is None or BirefNetToPIL is None or BirefNetDevice is None:
        return None

    source = ImageOps.exif_transpose(img.convert("RGB"))
    with torch.no_grad():
        tensor = BirefNetTransform(source).unsqueeze(0).to(BirefNetDevice)
        pred = birefnet(tensor)
        if isinstance(pred, (list, tuple)):
            pred = pred[-1]
        mask = pred.sigmoid().detach().cpu()[0].squeeze()
    mask_img = BirefNetToPIL(mask).resize(source.size, Image.LANCZOS)
    return mask_img.filter(ImageFilter.GaussianBlur(0.7)).point(lambda p: 255 if p > 24 else 0)


def logo_path() -> Path:
    configured = os.environ.get("PRODUCT_LOGO_PATH")
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[2] / "logo.jpg"


def make_white_logo_with_black_border(size: tuple[int, int]) -> Image.Image | None:
    path = logo_path()
    if not path.exists():
        print(f"[ai-image] logo not found at {path}", flush=True)
        return None

    logo = Image.open(path).convert("RGBA")
    logo.thumbnail(size, Image.LANCZOS)
    alpha = logo.getchannel("A")
    outline = alpha.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(0.4))

    bordered = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    bordered.paste((0, 0, 0, 255), (0, 0), outline)
    bordered.paste((255, 255, 255, 255), (0, 0), alpha)
    return bordered


def add_bottom_logo(canvas: Image.Image) -> Image.Image:
    out = canvas.convert("RGB")
    max_logo_size = (int(out.width * 0.34), int(out.height * 0.12))
    logo = make_white_logo_with_black_border(max_logo_size)
    if logo is None:
        return out

    x = (out.width - logo.width) // 2
    y = out.height - logo.height - int(out.height * 0.045)
    out.paste(logo, (x, y), logo)
    return out


def clean_product_photo(source: Image.Image, output_size: int = 900, use_birefnet: bool = False, add_logo: bool = False) -> Image.Image:
    output_size = int(np.clip(output_size, 512, 1400))
    source = ImageOps.exif_transpose(source.convert("RGB"))
    source.thumbnail((1400, 1400), Image.LANCZOS)

    mask = birefnet_foreground_mask(source) if use_birefnet else None
    if mask is None:
        mask = product_foreground_mask(source)
    bbox = mask.getbbox()
    if not bbox:
        bbox = source.getbbox() or (0, 0, source.width, source.height)

    # Pad before cropping so the object keeps a natural amount of breathing room.
    left, top, right, bottom = bbox
    pad = max(12, int(max(right - left, bottom - top) * 0.08))
    crop_box = (
        max(0, left - pad),
        max(0, top - pad),
        min(source.width, right + pad),
        min(source.height, bottom + pad),
    )
    product = source.crop(crop_box)
    product_mask = mask.crop(crop_box).filter(ImageFilter.GaussianBlur(1.2))

    # Normalize common phone-camera shadows without flattening the product.
    product = ImageOps.autocontrast(product, cutoff=1)
    product = ImageEnhance.Brightness(product).enhance(1.06)
    product = ImageEnhance.Contrast(product).enhance(1.08)
    product = ImageEnhance.Color(product).enhance(1.03)

    canvas = Image.new("RGB", (output_size, output_size), "white")
    max_product = int(output_size * 0.78)
    scale = min(max_product / max(product.width, product.height), 1.0)
    new_size = (
        max(1, int(product.width * scale)),
        max(1, int(product.height * scale)),
    )
    product = product.resize(new_size, Image.LANCZOS)
    product_mask = product_mask.resize(new_size, Image.LANCZOS)

    x = (output_size - new_size[0]) // 2
    logo_space = int(output_size * 0.14) if add_logo else 0
    y = max(int(output_size * 0.045), (output_size - logo_space - new_size[1]) // 2)
    canvas.paste(product, (x, y), product_mask)
    return add_bottom_logo(canvas) if add_logo else canvas


@app.post("/edit-product-photo", response_model=EditProductPhotoResponse)
def edit_product_photo(req: EditProductPhotoRequest):
    try:
        source = decode_image(req.image)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"bad image: {exc}") from exc

    try:
        mode = (req.processing_mode or "ai").strip().lower()
        edited = clean_product_photo(
            source,
            req.output_size,
            use_birefnet=mode == "simple",
            add_logo=mode == "simple",
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"could not edit product photo: {exc}") from exc

    return EditProductPhotoResponse(image=encode_image(edited, quality=92))
