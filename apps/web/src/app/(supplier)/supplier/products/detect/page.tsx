'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ImagePlus, ScanLine, Loader2, Check, Save } from 'lucide-react';
import { makeProductSlug } from '@diy-store/api-client';
import { useSupplierStore } from '@/lib/supplier-store';
import { vendureShopFetch } from '@/lib/vendure';
import { parsePrice } from '@/lib/price';
import { buildStudioPrompt, STUDIO_CATEGORY_KEYS } from '@/lib/studio-prompts';

type Detected = {
  id: string;
  label: string;
  category: string;
  box_2d: [number, number, number, number];
  confidence: number;
  thumb: string;
  selected: boolean;
  price: string;
  stock: string;
  enabled: boolean;
  studioImage?: string; // AI-аар үүсгэсэн студио зураг (хадгалахаас өмнө)
  generationSeconds?: number;
  status: 'idle' | 'generating' | 'generated' | 'saving' | 'saved' | 'error';
  error?: string;
};

const CREATE_SUPPLIER_PRODUCT_MUTATION = `
  mutation CreateSupplierProduct($input: SupplierProductInput!) {
    createSupplierProduct(input: $input) { id name slug }
  }
`;

function resizeImage(file: File, maxSize = 1400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Зураг уншихад алдаа гарлаа'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Зургийн формат буруу байна'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Зураг боловсруулах боломжгүй'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  });
}

function readOriginalImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Эх зураг уншихад алдаа гарлаа'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

function cropRegion(img: HTMLImageElement, box: [number, number, number, number], padPct = 0.08): string {
  const [ymin, xmin, ymax, xmax] = box;
  const W = img.naturalWidth, H = img.naturalHeight;
  let x = (xmin / 1000) * W, y = (ymin / 1000) * H;
  let w = ((xmax - xmin) / 1000) * W, h = ((ymax - ymin) / 1000) * H;
  const padX = w * padPct, padY = h * padPct;
  x = Math.max(0, x - padX); y = Math.max(0, y - padY);
  w = Math.min(W - x, w + 2 * padX); h = Math.min(H - y, h + 2 * padY);
  // Keep enough pixels for a useful preview and for the image-edit model.
  // Detection uses a resized copy, but crops always come from the original.
  const longEdge = Math.max(w, h);
  const outputLongEdge = Math.min(1800, Math.max(900, longEdge));
  const scale = outputLongEdge / Math.max(1, longEdge);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.96);
}

async function studioEdit(image: string, category: string): Promise<{ image: string; seconds?: number }> {
  const res = await fetch('/edit-product-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // This flow must always be a real OpenAI image edit. `mode: studio` may
    // silently fall back to another engine, so use the provider explicitly.
    body: JSON.stringify({
      image,
      outputSize: 900,
      mode: 'ai',
      provider: 'openai',
      prompt: buildStudioPrompt(category),
    }),
  });
  const json = (await res.json()) as { image?: string; error?: string; seconds?: number };
  if (!res.ok || json.error || !json.image) throw new Error(json.error || 'Студио зураг үүсгэхэд алдаа');
  return { image: json.image, seconds: json.seconds };
}

export default function DetectProductsPage() {
  const router = useRouter();
  const { supplier } = useSupplierStore();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [original, setOriginal] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [items, setItems] = useState<Detected[]>([]);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const selectedCount = items.filter((i) => i.selected).length;
  const generatedCount = items.filter((i) => i.selected && i.studioImage).length;

  async function onUpload(file: File) {
    setError(''); setItems([]); setSavedCount(0);
    try {
      const [detectionImage, sourceImage] = await Promise.all([
        resizeImage(file),
        readOriginalImage(file),
      ]);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const source = new Image();
        source.onerror = () => reject(new Error('Эх зургийн формат буруу байна'));
        source.onload = () => resolve(source);
        source.src = sourceImage;
      });
      imgRef.current = img;
      setOriginal(detectionImage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Зураг алдаа');
    }
  }

  async function runDetect() {
    if (!original) return;
    setDetecting(true); setError(''); setItems([]);
    try {
      const res = await fetch('/detect-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: original }),
      });
      const json = (await res.json()) as { products?: Detected[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error || 'Таних алдаа');
      // ensure the image element is loaded for cropping
      const img = imgRef.current ?? await new Promise<HTMLImageElement>((resolve) => {
        const im = new Image(); im.onload = () => resolve(im); im.src = original;
      });
      imgRef.current = img;
      const detected: Detected[] = (json.products ?? []).map((p, idx) => ({
        id: `d-${idx}`,
        label: p.label,
        category: p.category,
        box_2d: p.box_2d,
        confidence: p.confidence,
        thumb: cropRegion(img, p.box_2d, 0.08),
        selected: p.confidence >= 70,
        price: '',
        stock: '',
        enabled: true,
        status: 'idle',
      }));
      setItems(detected);
      if (detected.length === 0) setError('Бараа танигдсангүй. Илүү тод зураг оруулна уу.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Таних алдаа');
    } finally {
      setDetecting(false);
    }
  }

  function update(id: string, patch: Partial<Detected>) {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  // Алхам 1: сонгосон бараа бүрийг тухайн төрлийн prompt-оор студио зураг болгож
  // ҮҮСГЭНЭ (хадгалахгүй) — жагсаалт дээр харагдаж, эзэн хянана.
  async function generateImages() {
    const targets = items.filter((i) => i.selected);
    if (targets.length === 0) { setError('Дор хаяж нэг бараа сонгоно уу'); return; }
    setGenerating(true); setError('');
    const failures: string[] = [];
    // Run up to three image edits together. Larger selections continue in
    // batches of three to avoid sudden API rate-limit spikes.
    for (let start = 0; start < targets.length; start += 3) {
      const batch = targets.slice(start, start + 3);
      await Promise.all(batch.map(async (item) => {
        update(item.id, { status: 'generating', error: undefined, generationSeconds: undefined });
        try {
          // Give OpenAI the selected product and a little surrounding context,
          // matching the successful single-product edit workflow.
          const crop = cropRegion(imgRef.current!, item.box_2d, 0.12);
          const studio = await studioEdit(crop, item.category);
          update(item.id, {
            studioImage: studio.image,
            thumb: studio.image,
            status: 'generated',
            generationSeconds: studio.seconds,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Зураг үүсгэх алдаа';
          failures.push(`${item.label}: ${message}`);
          update(item.id, { status: 'error', error: message });
        }
      }));
    }
    if (failures.length > 0) setError(failures.join('\n'));
    setGenerating(false);
  }

  // Алхам 2: үүсгэсэн зурагтай бараануудыг дэлгүүрт НЭМНЭ.
  async function saveAll() {
    if (!supplier?.id) { setError('Нэвтрэлт олдсонгүй'); return; }
    const targets = items.filter((i) => i.selected && i.studioImage);
    if (targets.length === 0) { setError('Эхлээд зураг үүсгэнэ үү'); return; }
    const missingNames = targets.filter((i) => !i.label.trim());
    if (missingNames.length > 0) { setError(`${missingNames.length} барааны нэр дутуу байна`); return; }
    const noPrice = targets.filter((i) => parsePrice(i.price) <= 0);
    if (noPrice.length > 0) { setError(`${noPrice.length} барааны үнэ дутуу байна`); return; }
    const noStock = targets.filter((i) => i.stock.trim() === '' || !Number.isFinite(Number(i.stock)) || Number(i.stock) < 0);
    if (noStock.length > 0) { setError(`${noStock.length} барааны үлдэгдэл дутуу эсвэл буруу байна`); return; }
    setSaving(true); setError(''); setSavedCount(0);
    let ok = 0;
    for (const item of targets) {
      update(item.id, { status: 'saving' });
      try {
        await vendureShopFetch(CREATE_SUPPLIER_PRODUCT_MUTATION, {
          input: {
            supplierId: supplier.id,
            name: item.label.trim(),
            slug: `${makeProductSlug(item.label)}-${Date.now()}-${ok}`,
            image: item.studioImage,
            price: parsePrice(item.price),
            stock: Math.max(0, Math.round(Number(item.stock))),
            category: item.category,
            description: '',
            enabled: item.enabled,
          },
        });
        update(item.id, { status: 'saved' });
        ok += 1;
        setSavedCount(ok);
      } catch (e) {
        update(item.id, { status: 'error', error: e instanceof Error ? e.message : 'Хадгалах алдаа' });
      }
    }
    setSaving(false);
    if (ok > 0) setTimeout(() => router.push('/supplier/products'), 1400);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/supplier/products" className="rounded-xl p-2 text-foreground-muted hover:bg-white/5 hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-foreground">Зургаас олон бараа</h2>
          <p className="mt-0.5 text-sm text-foreground-muted">Нэг зургийг AI-аар таниулж, барааг тус бүрд нь студио зураг болгож нэмнэ</p>
        </div>
      </div>

      {/* Upload */}
      <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); }} />
        {!original ? (
          <button onClick={() => fileRef.current?.click()} className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--glass-border)] text-foreground-muted hover:border-brand/50 hover:text-foreground">
            <ImagePlus size={26} />
            <span className="text-sm font-semibold">Бүлэг зураг оруулах</span>
            <span className="text-[11px]">Олон бараа багтсан нэг зураг</span>
          </button>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={original} alt="" className="h-40 w-full rounded-xl object-contain sm:w-56" />
            <div className="flex flex-1 flex-wrap gap-2">
              <button onClick={() => fileRef.current?.click()} className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/10">Солих</button>
              <button onClick={() => void runDetect()} disabled={detecting} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60">
                {detecting ? <Loader2 size={15} className="animate-spin" /> : <ScanLine size={15} />}
                {detecting ? 'Таниж байна...' : '🔍 Бараа таних'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}

      {/* Detected list */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--glass-border)] bg-card p-4">
            <div>
              <p className="text-sm font-bold text-foreground">{items.length} бараа танигдлаа · {selectedCount} сонгосон</p>
              <p className="text-xs text-foreground-muted">
                {generatedCount > 0
                  ? 'Үүссэн бараа бүрийн нэр, төрөл, үнэ, үлдэгдлийг шалгаад нэмнэ'
                  : 'Сонгох/хасах, нэр/төрлийг засаад зураг үүсгэнэ'}
              </p>
            </div>
            {generatedCount > 0 && (
              <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
                {generatedCount} зураг бэлэн
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className={`relative rounded-2xl border bg-card p-2 transition-colors ${item.selected ? 'border-brand/50' : 'border-[var(--glass-border)] opacity-70'}`}>
                <button onClick={() => update(item.id, { selected: !item.selected })} className="absolute left-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-md border bg-card" style={{ borderColor: item.selected ? 'var(--brand,#FF6A1A)' : 'rgba(150,150,150,0.5)' }}>
                  {item.selected && <Check size={13} className="text-brand" />}
                </button>
                {item.status === 'saved' && <span className="absolute right-3 top-3 z-10 rounded-md bg-success/90 px-1.5 py-0.5 text-[9px] font-bold text-white">Хадгалсан</span>}
                {item.status === 'generated' && <span className="absolute right-3 top-3 z-10 rounded-md bg-brand/90 px-1.5 py-0.5 text-[9px] font-bold text-white">✨ Зураг бэлэн{item.generationSeconds ? ` · ${item.generationSeconds}с` : ''}</span>}
                {(item.status === 'generating' || item.status === 'saving') && <span className="absolute right-3 top-3 z-10"><Loader2 size={14} className="animate-spin text-brand" /></span>}
                {item.status === 'error' && <span className="absolute right-3 top-3 z-10 rounded-md bg-error/90 px-1.5 py-0.5 text-[9px] font-bold text-white" title={item.error}>Алдаа</span>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumb} alt={item.label} className="h-28 w-full rounded-xl bg-surface object-contain" />
                <input value={item.label} onChange={(e) => update(item.id, { label: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--glass-border)] bg-surface px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-brand" />
                <div className="mt-1 flex items-end gap-1">
                  <label className="flex-1 space-y-0.5">
                    {item.studioImage && <span className="text-[9px] text-foreground-muted">Төрөл *</span>}
                    <select value={STUDIO_CATEGORY_KEYS.includes(item.category) ? item.category : 'бусад'} onChange={(e) => update(item.id, { category: e.target.value })} className="w-full rounded-lg border border-[var(--glass-border)] bg-surface px-2 py-1 text-[11px] text-foreground outline-none">
                      {STUDIO_CATEGORY_KEYS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <span className="pb-1 text-[10px] text-foreground-muted">{item.confidence}%</span>
                </div>
                {item.studioImage && (
                  <div className="mt-2 space-y-1.5 rounded-xl border border-success/20 bg-success/5 p-2">
                    <p className="text-[10px] font-bold text-success">Барааны мэдээлэл</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <label className="space-y-0.5">
                        <span className="text-[9px] text-foreground-muted">Үнэ ₮ *</span>
                        <input
                          value={item.price}
                          inputMode="numeric"
                          onChange={(e) => update(item.id, { price: e.target.value.replace(/[^\d]/g, '') })}
                          placeholder="59900"
                          className="w-full rounded-lg border border-[var(--glass-border)] bg-surface px-2 py-1.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-brand"
                        />
                      </label>
                      <label className="space-y-0.5">
                        <span className="text-[9px] text-foreground-muted">Үлдэгдэл *</span>
                        <input
                          value={item.stock}
                          inputMode="numeric"
                          onChange={(e) => update(item.id, { stock: e.target.value.replace(/[^\d]/g, '') })}
                          placeholder="1"
                          className="w-full rounded-lg border border-[var(--glass-border)] bg-surface px-2 py-1.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-brand"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => update(item.id, { enabled: !item.enabled })}
                      className={`w-full rounded-lg px-2 py-1 text-[10px] font-bold ${item.enabled ? 'bg-success/15 text-success' : 'bg-foreground-muted/15 text-foreground-muted'}`}
                    >
                      {item.enabled ? 'Дэлгүүрт харагдана' : 'Нуусан байдлаар нэмнэ'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && <div className="whitespace-pre-line rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}

          {/* Алхам 1: зураг үүсгэх */}
          <button onClick={() => void generateImages()} disabled={generating || saving || selectedCount === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand-hover disabled:opacity-60">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <span>✨</span>}
            {generating ? 'Студио зураг үүсгэж байна...' : `✨ ${selectedCount} барааны зураг үүсгэх`}
          </button>

          {/* Алхам 2: хянаад дэлгүүрт нэмэх (зураг үүссэний дараа) */}
          {generatedCount > 0 && (
            <button onClick={() => void saveAll()} disabled={saving || generating} className="sticky bottom-4 z-20 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success px-5 py-4 text-sm font-bold text-white shadow-xl shadow-success/20 hover:brightness-95 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? `Үндсэн системд бүртгэж байна... (${savedCount}/${generatedCount})` : `${generatedCount} бараа нэмэх`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
