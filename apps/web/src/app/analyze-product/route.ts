import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getAnalyzeEndpoint() {
  const explicit = process.env.INTERNAL_PRODUCT_AI_API;
  if (explicit) return explicit;

  const shopApi = process.env.INTERNAL_VENDURE_SHOP_API || process.env.NEXT_PUBLIC_VENDURE_SHOP_API;
  if (shopApi?.startsWith('http')) {
    return shopApi.replace(/\/shop-api\/?$/, '/analyze-product');
  }

  return 'http://localhost:13001/analyze-product';
}

function getMediaTypeFromDataUrl(value: string) {
  return value.match(/^data:([^;]+);base64,/)?.[1];
}

async function fileToBase64(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString('base64');
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let image = '';
    let mediaType = 'image/jpeg';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('image');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'image file is required' }, { status: 400 });
      }
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'image must be an image file' }, { status: 400 });
      }
      image = await fileToBase64(file);
      mediaType = file.type || mediaType;
    } else {
      const body = await request.json();
      image = String(body?.image ?? '');
      mediaType = String(body?.mediaType ?? getMediaTypeFromDataUrl(image) ?? mediaType);
    }

    if (!image) {
      return NextResponse.json({ error: 'image is required' }, { status: 400 });
    }

    const response = await fetch(getAnalyzeEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mediaType }),
      cache: 'no-store',
    });

    const text = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: text || 'Invalid analyze response' };
    }

    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Product image analysis failed' },
      { status: 500 },
    );
  }
}
