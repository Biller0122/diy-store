import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type DetectBody = { image?: string };

export type DetectedProduct = {
  label: string;
  category: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  confidence: number;
};

const DETECTION_PROMPT = `Detect every distinct sellable product in this photo (power tools, drills, saws, grinders, batteries, chargers, blowers, paint, pipes, fittings, accessories, building materials, etc.).
Return ONLY a JSON array. Each item must have:
- "label": short Mongolian product name (e.g. "Цахилгаан өрөм", "Гинжин хөрөө", "Батарей")
- "category": one of [багаж, цахилгаан, сантехник, будаг, цемент, обой, кафель, ламинат, тоосго, төмөр, мод, гэрэл, дээвэр, дулаалга, бусад]
- "box_2d": [ymin, xmin, ymax, xmax] normalized to 0-1000
- "confidence": 0-100
Group items that clearly form one product (e.g. a drill in its case = one). Do not include people, floor, walls or background. Return at most 40 items.`;

export async function POST(request: Request) {
  let body: DetectBody;
  try {
    body = (await request.json()) as DetectBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const image = String(body.image ?? '');
  if (!image) return NextResponse.json({ error: 'image is required' }, { status: 400 });

  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'GEMINI_API_KEY тохируулаагүй байна' }, { status: 503 });
  }

  const base64 = image.includes(',') && image.startsWith('data:') ? image.split(',', 2)[1] : image;
  const mime = image.startsWith('data:') ? image.slice(5, image.indexOf(';')) : 'image/jpeg';
  const model = process.env.GEMINI_DETECT_MODEL || 'gemini-2.5-flash';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: DETECTION_PROMPT }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      },
    );
    const json = (await res.json()) as any;
    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message || `Gemini алдаа: ${res.status}` }, { status: 502 });
    }
    const text: string = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('') ?? '';
    let products: DetectedProduct[] = [];
    try {
      const parsed = JSON.parse(text);
      products = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.products) ? parsed.products : [];
    } catch {
      // Try to extract a JSON array substring
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { products = JSON.parse(match[0]); } catch { products = []; }
      }
    }
    // Validate / clamp
    products = products
      .filter((p) => p && Array.isArray(p.box_2d) && p.box_2d.length === 4)
      .map((p) => ({
        label: String(p.label ?? 'Бараа'),
        category: String(p.category ?? 'бусад'),
        box_2d: p.box_2d.map((n) => Math.max(0, Math.min(1000, Number(n) || 0))) as [number, number, number, number],
        confidence: Math.max(0, Math.min(100, Number(p.confidence ?? 0))),
      }));
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error && error.name === 'AbortError' ? 'Таних хугацаа хэтэрлээ' : error instanceof Error ? error.message : 'Бараа таних алдаа' },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
