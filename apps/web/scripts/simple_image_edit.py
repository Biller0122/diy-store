import base64
import io
import json
import os
import sys
import time
import urllib.request

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

MODEL_URL = "https://huggingface.co/onnx-community/BiRefNet_lite-ONNX/resolve/main/onnx/model.onnx"
MODEL_DIR = os.environ.get("BIREFNET_MODEL_DIR", "/tmp/diy-store-models")
LOCAL_MODEL_PATH = "/home/bat/Documents/image_dit/models/birefnet_lite.onnx"
ONNX_MODEL_PATH = os.environ.get("BIREFNET_ONNX_MODEL_PATH") or (
    LOCAL_MODEL_PATH if os.path.exists(LOCAL_MODEL_PATH) else os.path.join(MODEL_DIR, "birefnet_lite.onnx")
)

SESSION = None
INPUT_NAME = None
MODEL_INPUT_SIZE = int(os.environ.get("BIREFNET_ONNX_INPUT_SIZE", "1024"))


def ensure_model():
    os.makedirs(os.path.dirname(ONNX_MODEL_PATH), exist_ok=True)
    if not os.path.exists(ONNX_MODEL_PATH):
        urllib.request.urlretrieve(MODEL_URL, ONNX_MODEL_PATH)


def session():
    global SESSION, INPUT_NAME
    if SESSION is not None:
        return SESSION, INPUT_NAME

    ensure_model()
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = int(os.environ.get("BIREFNET_ONNX_THREADS", "4"))
    opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    optimization = os.environ.get("BIREFNET_ONNX_OPTIMIZATION", "basic").lower()
    opts.graph_optimization_level = (
        ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        if optimization == "all"
        else ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
    )
    SESSION = ort.InferenceSession(ONNX_MODEL_PATH, sess_options=opts, providers=["CPUExecutionProvider"])
    INPUT_NAME = SESSION.get_inputs()[0].name
    return SESSION, INPUT_NAME


def decode_image(value):
    if "," in value and value.strip().startswith("data:"):
        value = value.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(value))).convert("RGB")


def encode_jpeg(img):
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=95, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def logo_path():
    candidates = [
        os.environ.get("PRODUCT_LOGO_PATH"),
        os.path.join(os.getcwd(), "apps/web/public/logo_black.png"),
        os.path.join(os.getcwd(), "public/logo_black.png"),
        os.path.join(os.getcwd(), "logo_black.png"),
    ]
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    return None


def load_logo(max_size):
    path = logo_path()
    if not path:
        return None

    logo = Image.open(path).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    logo.thumbnail(max_size, Image.Resampling.LANCZOS)
    return logo


def add_bottom_logo(canvas):
    logo = load_logo((int(canvas.width * 0.40), int(canvas.height * 0.14)))
    if logo is None:
        return canvas
    x = (canvas.width - logo.width) // 2
    y = canvas.height - logo.height - int(canvas.height * 0.045)
    canvas.paste(logo, (x, y), logo)
    return canvas


def paste_logo(canvas, logo, bottom_margin):
    if logo is None:
        return canvas
    x = (canvas.width - logo.width) // 2
    y = canvas.height - logo.height - bottom_margin
    canvas.paste(logo, (x, y), logo)
    return canvas


def run_onnx_cpu_ecommerce_pipeline(image_value, padding_percent=3, target_size=(1000, 1000)):
    start_time = time.time()
    sess, input_name = session()

    img = ImageOps.exif_transpose(decode_image(image_value)).convert("RGB")
    original_w, original_h = img.size

    model_size = max(512, min(1024, MODEL_INPUT_SIZE))
    img_resized = img.resize((model_size, model_size), Image.Resampling.BILINEAR)
    img_np = np.array(img_resized).astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    img_np = (img_np - mean) / std
    img_np = np.transpose(img_np, (2, 0, 1))
    input_tensor = np.expand_dims(img_np, axis=0)

    outputs = sess.run(None, {input_name: input_tensor})
    raw_mask = outputs[-1].squeeze()
    pred_mask = 1.0 / (1.0 + np.exp(-raw_mask))
    mask_uint8 = (pred_mask * 255).astype(np.uint8)
    mask_pil = Image.fromarray(mask_uint8, mode="L")
    mask_resized = mask_pil.resize((original_w, original_h), Image.Resampling.BILINEAR)

    final_product = img.copy()
    final_product.putalpha(mask_resized)
    bbox = final_product.getbbox()
    if not bbox:
        raise ValueError("Could not isolate an object boundary.")

    cropped_obj = final_product.crop(bbox)
    polished = cropped_obj.filter(ImageFilter.SMOOTH_MORE)
    polished = polished.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    polished = ImageEnhance.Contrast(polished).enhance(1.25)
    polished = ImageEnhance.Color(polished).enhance(1.15)

    canvas_w, canvas_h = target_size
    logo = load_logo((int(canvas_w * 0.40), int(canvas_h * 0.14)))
    top_margin = int(canvas_h * padding_percent / 100)
    bottom_margin = int(canvas_h * 0.045)
    logo_gap = int(canvas_h * 0.03)
    reserved_logo_h = (logo.height + bottom_margin + logo_gap) if logo else 0
    item_area_h = max(1, canvas_h - top_margin - reserved_logo_h)
    padded_max_w = canvas_w * (100 - (padding_percent * 2)) / 100
    padded_max_h = max(1, item_area_h)
    obj_w, obj_h = polished.size
    scale_factor = min(padded_max_w / obj_w, padded_max_h / obj_h)
    new_obj_w = max(1, int(obj_w * scale_factor))
    new_obj_h = max(1, int(obj_h * scale_factor))
    resized_obj = polished.resize((new_obj_w, new_obj_h), Image.Resampling.LANCZOS)

    white_canvas = Image.new("RGB", target_size, (255, 255, 255))
    paste_x = (canvas_w - new_obj_w) // 2
    paste_y = top_margin + max(0, (item_area_h - new_obj_h) // 2)
    white_canvas.paste(resized_obj, (paste_x, paste_y), resized_obj)
    white_canvas = paste_logo(white_canvas, logo, bottom_margin)
    elapsed = time.time() - start_time
    return {"image": encode_jpeg(white_canvas), "engine": "birefnet-lite-onnx-cpu", "seconds": elapsed}


def main():
    payload = json.load(sys.stdin)
    size = int(payload.get("outputSize") or payload.get("output_size") or 1000)
    result = run_onnx_cpu_ecommerce_pipeline(
        payload["image"],
        padding_percent=int(payload.get("paddingPercent") or 3),
        target_size=(size, size),
    )
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
