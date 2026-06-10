import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Local GPU service (apps/ai-image). In production point this at a tunnel
// (Cloudflare Tunnel / Tailscale) or a cloud GPU endpoint.
const GPU_SERVICE_URL = process.env.GPU_SERVICE_URL || 'http://localhost:8500';
const GENERATE_TIMEOUT_MS = Number(process.env.GPU_TIMEOUT_MS ?? 110000);

type GenerateBody = {
  image?: string;
  category?: string;
  seed?: number;
};

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Зураг үүсгэх хугацаа хэтэрлээ. GPU сервер ажиллаж байгаа эсэхийг шалгана уу.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const image = String(body.image ?? '');
  if (!image) {
    return NextResponse.json({ error: 'image is required' }, { status: 400 });
  }

  try {
    const response = await fetchWithTimeout(`${GPU_SERVICE_URL}/generate-pattern`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        category: body.category ?? 'обой',
        ...(typeof body.seed === 'number' ? { seed: body.seed } : {}),
      }),
      cache: 'no-store',
    });

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: text || 'GPU service returned an invalid response' };
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: json?.detail || json?.error || 'Зураг үүсгэж чадсангүй' },
        { status: response.status >= 400 ? response.status : 502 },
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Зураг үүсгэхэд алдаа гарлаа' },
      { status: 502 },
    );
  }
}
