"""
CPU-only product image cleanup service for DIY Store.

This service intentionally does not load or call generative image models.
It exposes:
  - GET  /health
  - POST /clean-product
  - POST /edit-product-photo

Run:
    uvicorn service:app --host 0.0.0.0 --port 8500
"""

import base64
import io
import os
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel

MAX_IMAGE_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
ISNET_MODEL = os.environ.get("ISNET_MODEL", "isnet-general-use")
LOGO_PATH = os.environ.get(
    "LOGO_PATH", os.path.join(os.path.dirname(__file__), "assets", "logo.png")
)

_rembg_session = None
LOGO_DARK = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _load_logo()
    print("[ai-image] cleanup-only mode (CPU)", flush=True)
    yield


app = FastAPI(lifespan=lifespan)


def decode_image(value: str) -> Image.Image:
    if "," in value and value.strip().startswith("data:"):
        value = value.split(",", 1)[1]
    compact = "".join(value.split())
    estimated_bytes = (len(compact) * 3) // 4
    if estimated_bytes > MAX_IMAGE_BYTES:
        raise ValueError(f"image too large; max {MAX_IMAGE_BYTES // (1024 * 1024)}MB")
    raw = base64.b64decode(compact, validate=True)
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError(f"image too large; max {MAX_IMAGE_BYTES // (1024 * 1024)}MB")
    return Image.open(io.BytesIO(raw)).convert("RGB")


def encode_image(img: Image.Image, fmt: str = "JPEG", quality: int = 90) -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _load_logo():
    global LOGO_DARK
    if LOGO_DARK is not None or not os.path.isfile(LOGO_PATH):
        return
    logo = Image.open(LOGO_PATH).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    arr = np.array(logo).astype(np.int32)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    is_orange = (r > 150) & (b < 120) & (g < r)
    recolor = (a > 0) & (~is_orange)
    arr[recolor, 0] = 55
    arr[recolor, 1] = 55
    arr[recolor, 2] = 55
    LOGO_DARK = Image.fromarray(arr.astype(np.uint8))


def _rembg():
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session
        _rembg_session = new_session(ISNET_MODEL)
    return _rembg_session


def _largest_component(alpha: np.ndarray) -> np.ndarray:
    from scipy import ndimage

    binary = alpha > 30
    labels, count = ndimage.label(binary)
    if count <= 1:
        return alpha
    sizes = ndimage.sum(binary, labels, range(1, count + 1))
    return np.where(labels == (int(np.argmax(sizes)) + 1), alpha, 0).astype(np.uint8)


def _cutout(img: Image.Image) -> Image.Image:
    from rembg import remove

    cut = remove(
        img.convert("RGBA"),
        session=_rembg(),
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
        post_process_mask=True,
    )
    arr = np.array(cut)
    arr[:, :, 3] = _largest_component(arr[:, :, 3])
    return Image.fromarray(arr)


def _studio_shadow(
    cut: Image.Image,
    pad=0.12,
    offset_y=0.045,
    blur=14,
    opacity=0.30,
    squash=0.5,
) -> Image.Image:
    from scipy import ndimage

    w, h = cut.size
    canvas_w, canvas_h = w, h + int(h * pad)
    alpha = np.array(cut)[:, :, 3]
    band = np.array(Image.fromarray(alpha).resize((w, max(1, int(h * squash))), Image.BILINEAR))
    shadow_alpha = np.zeros((canvas_h, canvas_w), np.float32)
    top = min(int(h * (1 - squash)) + int(h * offset_y), canvas_h - band.shape[0])
    shadow_alpha[top:top + band.shape[0], :w] = band
    shadow_alpha = ndimage.gaussian_filter(shadow_alpha, sigma=blur) * opacity
    shadow = np.zeros((canvas_h, canvas_w, 4), np.uint8)
    shadow[:, :, :3] = 90
    shadow[:, :, 3] = np.clip(shadow_alpha, 0, 255).astype(np.uint8)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (255, 255, 255, 255))
    canvas.alpha_composite(Image.fromarray(shadow))
    canvas.alpha_composite(cut, (0, 0))
    return canvas


def _add_logo(canvas: Image.Image, width_fraction=0.42, margin=0.025) -> Image.Image:
    if LOGO_DARK is None:
        return canvas.convert("RGB")
    width, height = canvas.size
    logo_width = int(width * width_fraction)
    logo_height = int(logo_width * LOGO_DARK.height / LOGO_DARK.width)
    logo = LOGO_DARK.resize((logo_width, logo_height), Image.LANCZOS)
    canvas.alpha_composite(logo, ((width - logo_width) // 2, height - logo_height - int(height * margin)))
    return canvas.convert("RGB")


def clean_product(img: Image.Image, logo: bool = True, output_size: int | None = None) -> Image.Image:
    img = img.copy()
    img.thumbnail((1400, 1400), Image.LANCZOS)
    out = _studio_shadow(_cutout(img))
    if output_size:
        size = int(np.clip(output_size, 512, 1400))
        out.thumbnail((size, size), Image.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        canvas.alpha_composite(out, ((size - out.width) // 2, (size - out.height) // 2))
        out = canvas
    return _add_logo(out) if logo else out.convert("RGB")


class CleanRequest(BaseModel):
    image: str
    logo: bool = True


class CleanResponse(BaseModel):
    image: str


class EditProductPhotoRequest(BaseModel):
    image: str
    output_size: int = 900
    processing_mode: str = "ai"


class EditProductPhotoResponse(BaseModel):
    image: str


@app.get("/health")
def health():
    return {"ok": True, "cleanup": True, "model": ISNET_MODEL}


@app.post("/clean-product", response_model=CleanResponse)
def clean_product_endpoint(req: CleanRequest):
    try:
        source = decode_image(req.image)
    except Exception as exc:
        raise HTTPException(400, f"bad image: {exc}") from exc
    try:
        result = clean_product(source, logo=req.logo)
    except Exception as exc:
        raise HTTPException(500, f"cleanup failed: {exc}") from exc
    return CleanResponse(image=encode_image(result, quality=92))


@app.post("/edit-product-photo", response_model=EditProductPhotoResponse)
def edit_product_photo(req: EditProductPhotoRequest):
    try:
        source = decode_image(req.image)
    except Exception as exc:
        raise HTTPException(400, f"bad image: {exc}") from exc
    try:
        mode = (req.processing_mode or "ai").strip().lower()
        result = clean_product(source, logo=mode == "simple", output_size=req.output_size)
    except Exception as exc:
        raise HTTPException(500, f"could not edit product photo: {exc}") from exc
    return EditProductPhotoResponse(image=encode_image(result, quality=92))
