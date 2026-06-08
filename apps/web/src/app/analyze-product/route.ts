import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ANALYZE_TIMEOUT_MS = 30000;

function getShopApiEndpoint(request: Request) {
  const configured = process.env.INTERNAL_VENDURE_SHOP_API || process.env.NEXT_PUBLIC_VENDURE_SHOP_API;
  if (configured?.startsWith('http')) return configured;
  if (configured?.startsWith('/')) {
    return new URL(configured, request.url).toString();
  }
  return new URL('/shop-api', request.url).toString();
}

function getMediaTypeFromDataUrl(value: string) {
  return value.match(/^data:([^;]+);base64,/)?.[1];
}

async function fileToBase64(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString('base64');
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI шинжилгээ хэт удаж байна. Түр хүлээгээд дахин оролдоно уу.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

    const response = await fetchWithTimeout(getShopApiEndpoint(request), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation AnalyzeProductImage($image: String!, $mediaType: String) {
            analyzeProductImage(image: $image, mediaType: $mediaType) {
              name
              description
              category
              unit
              confidence
            }
          }
        `,
        variables: { image, mediaType },
      }),
      cache: 'no-store',
    });

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: text || 'Invalid analyze response' };
    }

    if (json?.errors?.length) {
      const message = json.errors.map((error: { message?: string }) => error.message).filter(Boolean).join('; ');
      return NextResponse.json({ error: message || 'AI шинжилгээ амжилтгүй боллоо' }, { status: response.status >= 400 ? response.status : 500 });
    }

    return NextResponse.json(json?.data?.analyzeProductImage ?? json, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Product image analysis failed' },
      { status: 500 },
    );
  }
}
