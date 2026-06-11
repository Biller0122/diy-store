import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 300;

const GPU_SERVICE_URL = process.env.GPU_SERVICE_URL || 'http://localhost:8500';
const EDIT_TIMEOUT_MS = Number(process.env.GPU_EDIT_TIMEOUT_MS ?? 55000);
const SIMPLE_EDIT_TIMEOUT_MS = Number(process.env.SIMPLE_EDIT_TIMEOUT_MS ?? 280000);
const LOCAL_EDIT_SIZE = 900;

type EditProductImageBody = {
  image?: string;
  outputSize?: number;
  mode?: 'simple' | 'ai';
};

type EditedProductImage = {
  image?: string;
  error?: string;
  engine?: string;
  seconds?: number;
};

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EDIT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Зураг янзлах хугацаа хэтэрлээ. AI зураг сервер ажиллаж байгаа эсэхийг шалгана уу.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function imageBufferFromDataUrl(value: string) {
  const base64 = value.includes(',') && value.trim().startsWith('data:')
    ? value.split(',', 2)[1]
    : value;
  return Buffer.from(base64, 'base64');
}

function dataUrlFromJpeg(buffer: Buffer) {
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

function findSimpleEditScript() {
  const candidates = [
    path.join(process.cwd(), 'apps/web/scripts/simple_image_edit.py'),
    path.join(process.cwd(), 'scripts/simple_image_edit.py'),
  ];
  const scriptPath = candidates.find((candidate) => existsSync(candidate));
  if (!scriptPath) throw new Error('Энгийн зураг янзлах Python script олдсонгүй');
  return scriptPath;
}

async function editWithOnnxPython(image: string, outputSize = 1000) {
  const scriptPath = findSimpleEditScript();
  const python = process.env.PYTHON_BIN || 'python3';
  const payload = JSON.stringify({ image, outputSize, paddingPercent: 3 });

  return new Promise<EditedProductImage>((resolve, reject) => {
    const child = spawn(python, [scriptPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      child.kill('SIGKILL');
      reject(new Error('Энгийн зураг янзлах хугацаа хэтэрлээ'));
    }, SIMPLE_EDIT_TIMEOUT_MS);

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        const jsonLine = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .reverse()
          .find((line) => line.startsWith('{') && line.endsWith('}'));
        const result = JSON.parse(jsonLine || '{}') as EditedProductImage;
        if (code !== 0 || result.error || !result.image) {
          const message = result.error || stderr.trim() || stdout.trim() || `Python process exited with code ${code ?? 'unknown'}${signal ? `, signal ${signal}` : ''}`;
          reject(new Error(message.slice(0, 1200)));
          return;
        }
        resolve(result);
      } catch {
        const message = stderr.trim() || stdout.trim() || `Python process exited with code ${code ?? 'unknown'}${signal ? `, signal ${signal}` : ''}`;
        reject(new Error(message.slice(0, 1200)));
      }
    });

    child.stdin.end(payload);
  });
}

function growMask(mask: Uint8Array, width: number, height: number, radius: number) {
  const grown = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let found = false;
      for (let dy = -radius; dy <= radius && !found; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = x + dx;
          if (xx >= 0 && xx < width && mask[yy * width + xx]) {
            found = true;
            break;
          }
        }
      }
      grown[y * width + x] = found ? 1 : 0;
    }
  }
  return grown;
}

async function makeLogoOverlay(maxWidth: number, maxHeight: number) {
  const logoPath = [
    path.join(process.cwd(), 'apps/web/public/shoptool-logo.png'),
    path.join(process.cwd(), 'public/shoptool-logo.png'),
    path.join(process.cwd(), 'shoptool-logo.png'),
  ].find((candidate) => existsSync(candidate));
  if (!logoPath) throw new Error('Лого файл олдсонгүй');

  const { data, info } = await sharp(logoPath)
    .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const alpha = new Uint8Array(info.width * info.height);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = data[i * 4 + 3];

  const overlay = Buffer.alloc(info.width * info.height * 4);
  const radius = 3;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const pixel = y * info.width + x;
      const out = pixel * 4;
      if (alpha[pixel] > 12) {
        overlay[out] = 255;
        overlay[out + 1] = 255;
        overlay[out + 2] = 255;
        overlay[out + 3] = alpha[pixel];
        continue;
      }

      let outline = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= info.height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = x + dx;
          if (xx >= 0 && xx < info.width) outline = Math.max(outline, alpha[yy * info.width + xx]);
        }
      }
      if (outline > 12) {
        overlay[out + 3] = Math.min(230, outline);
      }
    }
  }

  return {
    buffer: await sharp(overlay, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(),
    width: info.width,
    height: info.height,
  };
}

async function editLocallyWithLogo(image: string, outputSize = LOCAL_EDIT_SIZE) {
  const size = Math.max(512, Math.min(1400, Math.round(outputSize || LOCAL_EDIT_SIZE)));
  const input = imageBufferFromDataUrl(image);
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const edge = Math.max(8, Math.floor(Math.min(info.width, info.height) / 18));
  const bg = [0, 0, 0];
  let bgCount = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (x >= edge && x < info.width - edge && y >= edge && y < info.height - edge) continue;
      const index = (y * info.width + x) * 4;
      bg[0] += data[index];
      bg[1] += data[index + 1];
      bg[2] += data[index + 2];
      bgCount += 1;
    }
  }
  const bgColor = bg.map((value) => value / Math.max(1, bgCount));

  const mask = new Uint8Array(info.width * info.height);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const distance = Math.hypot(r - bgColor[0], g - bgColor[1], b - bgColor[2]);
      const maxc = Math.max(r, g, b);
      const minc = Math.min(r, g, b);
      const saturation = maxc - minc;
      const brightness = (r + g + b) / 3;
      if (distance > 26 || (saturation > 34 && distance > 12) || (brightness < 175 && distance > 16)) {
        mask[y * info.width + x] = 1;
      }
    }
  }
  const grown = growMask(mask, info.width, info.height, 5);

  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (!grown[y * info.width + x]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (minX >= maxX || minY >= maxY) throw new Error('Гол объектыг таньж чадсангүй. Илүү тод зураг сонгоно уу.');

  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.08);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(info.width - 1, maxX + pad);
  maxY = Math.min(info.height - 1, maxY + pad);
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const crop = Buffer.alloc(cropW * cropH * 4);
  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      const sourceX = minX + x;
      const sourceY = minY + y;
      const sourceIndex = (sourceY * info.width + sourceX) * 4;
      const targetIndex = (y * cropW + x) * 4;
      crop[targetIndex] = Math.min(255, Math.round((data[sourceIndex] - 128) * 1.08 + 138));
      crop[targetIndex + 1] = Math.min(255, Math.round((data[sourceIndex + 1] - 128) * 1.08 + 138));
      crop[targetIndex + 2] = Math.min(255, Math.round((data[sourceIndex + 2] - 128) * 1.08 + 138));
      crop[targetIndex + 3] = grown[sourceY * info.width + sourceX] ? 255 : 0;
    }
  }

  const productMax = Math.round(size * 0.72);
  const scale = Math.min(productMax / Math.max(cropW, cropH), 1);
  const drawW = Math.max(1, Math.round(cropW * scale));
  const drawH = Math.max(1, Math.round(cropH * scale));
  const logo = await makeLogoOverlay(Math.round(size * 0.34), Math.round(size * 0.12));
  const product = await sharp(crop, { raw: { width: cropW, height: cropH, channels: 4 } })
    .resize(drawW, drawH)
    .png()
    .toBuffer();

  const canvas = sharp({
    create: { width: size, height: size, channels: 3, background: '#ffffff' },
  });
  const jpeg = await canvas
    .composite([
      {
        input: product,
        left: Math.round((size - drawW) / 2),
        top: Math.max(Math.round(size * 0.045), Math.round((size - Math.round(size * 0.14) - drawH) / 2)),
      },
      {
        input: logo.buffer,
        left: Math.round((size - logo.width) / 2),
        top: size - logo.height - Math.round(size * 0.045),
      },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  return { image: dataUrlFromJpeg(jpeg) };
}

export async function POST(request: Request) {
  let body: EditProductImageBody;
  try {
    body = (await request.json()) as EditProductImageBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const image = String(body.image ?? '');
  if (!image) {
    return NextResponse.json({ error: 'image is required' }, { status: 400 });
  }

  if ((body.mode ?? 'ai') === 'simple') {
    try {
      const edited = await editWithOnnxPython(image, body.outputSize ?? 1000);
      return NextResponse.json(edited, { status: 200 });
    } catch (error) {
      console.error('[edit-product-image] simple ONNX failed', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Энгийн зураг янзлахад алдаа гарлаа' },
        { status: 502 },
      );
    }
  }

  try {
    const response = await fetchWithTimeout(`${GPU_SERVICE_URL}/edit-product-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        output_size: body.outputSize ?? 900,
        processing_mode: body.mode ?? 'ai',
      }),
      cache: 'no-store',
    });

    const text = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: text || 'AI зураг сервер буруу хариу буцаалаа' };
    }

    if (!response.ok) {
      const detail = typeof json === 'object' && json && 'detail' in json ? String(json.detail) : '';
      const error = typeof json === 'object' && json && 'error' in json ? String(json.error) : '';
      return NextResponse.json(
        { error: detail || error || 'Зураг янзалж чадсангүй' },
        { status: response.status >= 400 ? response.status : 502 },
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (error) {
    if ((body.mode ?? 'ai') === 'simple') {
      try {
        const fallback = await editLocallyWithLogo(image, body.outputSize ?? LOCAL_EDIT_SIZE);
        return NextResponse.json(fallback, { status: 200 });
      } catch (fallbackError) {
        return NextResponse.json(
          {
            error: fallbackError instanceof Error
              ? fallbackError.message
              : error instanceof Error ? error.message : 'Зураг янзлахад алдаа гарлаа',
          },
          { status: 502 },
        );
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Зураг янзлахад алдаа гарлаа' },
      { status: 502 },
    );
  }
}
