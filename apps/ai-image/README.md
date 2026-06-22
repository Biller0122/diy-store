# ai-image — product cleanup service

CPU-only image cleanup service for supplier product photos. It removes the
background, places the product on a clean studio background, adds a soft shadow,
and can overlay the ShopTool logo.

This service is deterministic cleanup only. It does not use a GPU or download
large image-generation models.

## Setup

```powershell
cd "apps\ai-image"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn service:app --host 0.0.0.0 --port 8500
```

Health check: http://localhost:8500/health

## API

```http
POST /clean-product
Content-Type: application/json
```

```json
{
  "image": "data:image/jpeg;base64,...",
  "logo": true
}
```

Response:

```json
{
  "image": "data:image/jpeg;base64,..."
}
```

`POST /edit-product-photo` is kept for the web image-edit proxy:

```json
{
  "image": "data:image/jpeg;base64,...",
  "output_size": 900,
  "processing_mode": "simple"
}
```

## Production

Deploy with `Dockerfile.cleanup` or a normal Python process on EC2. Point the
web app at it with `CLEANUP_SERVICE_URL`.
