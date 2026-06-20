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
  status: 'idle' | 'working' | 'done' | 'error';
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

function cropRegion(img: HTMLImageElement, box: [number, number, number, number], padPct = 0.08): string {
  const [ymin, xmin, ymax, xmax] = box;
  const W = img.naturalWidth, H = img.naturalHeight;
  let x = (xmin / 1000) * W, y = (ymin / 1000) * H;
  let w = ((xmax - xmin) / 1000) * W, h = ((ymax - ymin) / 1000) * H;
  const padX = w * padPct, padY = h * padPct;
  x = Math.max(0, x - padX); y = Math.max(0, y - padY);
  w = Math.min(W - x, w + 2 * padX); h = Math.min(H - y, h + 2 * padY);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w)); canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function studioEdit(image: string, category: string, label: string): Promise<string> {
  const res = await fetch('/edit-product-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, outputSize: 900, mode: 'studio', prompt: buildStudioPrompt(category, label) }),
  });
  const json = (await res.json()) as { image?: string; error?: string };
  if (!res.ok || json.error || !json.image) throw new Error(json.error || 'Студио зураг үүсгэхэд алдаа');
  return json.image;
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
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const selectedCount = items.filter((i) => i.selected).length;

  async function onUpload(file: File) {
    setError(''); setItems([]); setSavedCount(0);
    try {
      const data = await resizeImage(file);
      setOriginal(data);
      const img = new Image();
      img.onload = () => { imgRef.current = img; };
      img.src = data;
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

  async function generateAndSave() {
    if (!supplier?.id) { setError('Нэвтрэлт олдсонгүй'); return; }
    if (parsePrice(price) <= 0) { setError('Үнэ оруулна уу'); return; }
    const targets = items.filter((i) => i.selected);
    if (targets.length === 0) { setError('Дор хаяж нэг бараа сонгоно уу'); return; }
    setSaving(true); setError(''); setSavedCount(0);
    let ok = 0;
    for (const item of targets) {
      update(item.id, { status: 'working' });
      try {
        const crop = cropRegion(imgRef.current!, item.box_2d, 0.08);
        const studio = await studioEdit(crop, item.category, item.label);
        await vendureShopFetch(CREATE_SUPPLIER_PRODUCT_MUTATION, {
          input: {
            supplierId: supplier.id,
            name: item.label.trim(),
            slug: `${makeProductSlug(item.label)}-${Date.now()}-${ok}`,
            image: studio,
            price: parsePrice(price),
            stock: Math.max(0, Number(stock) || 0),
            category: item.category,
            description: '',
            enabled: true,
          },
        });
        update(item.id, { status: 'done' });
        ok += 1;
        setSavedCount(ok);
      } catch (e) {
        update(item.id, { status: 'error', error: e instanceof Error ? e.message : 'Алдаа' });
      }
    }
    setSaving(false);
    if (ok > 0) setTimeout(() => router.push('/supplier/products'), 1200);
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
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[var(--glass-border)] bg-card p-4">
            <div>
              <p className="text-sm font-bold text-foreground">{items.length} бараа танигдлаа · {selectedCount} сонгосон</p>
              <p className="text-xs text-foreground-muted">Сонгох/хасах, нэр/ангиллыг засаж болно</p>
            </div>
            <div className="flex gap-3">
              <label className="space-y-1">
                <span className="text-[11px] text-foreground-muted">Үнэ (бүгдэд) *</span>
                <input value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))} placeholder="59900" className="w-28 rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-foreground-muted">Нөөц</span>
                <input value={stock} inputMode="numeric" onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ''))} className="w-20 rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className={`relative rounded-2xl border bg-card p-2 transition-colors ${item.selected ? 'border-brand/50' : 'border-[var(--glass-border)] opacity-70'}`}>
                <button onClick={() => update(item.id, { selected: !item.selected })} className="absolute left-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-md border bg-card" style={{ borderColor: item.selected ? 'var(--brand,#FF6A1A)' : 'rgba(150,150,150,0.5)' }}>
                  {item.selected && <Check size={13} className="text-brand" />}
                </button>
                {item.status === 'done' && <span className="absolute right-3 top-3 z-10 rounded-md bg-success/90 px-1.5 py-0.5 text-[9px] font-bold text-white">Хадгалсан</span>}
                {item.status === 'working' && <span className="absolute right-3 top-3 z-10"><Loader2 size={14} className="animate-spin text-brand" /></span>}
                {item.status === 'error' && <span className="absolute right-3 top-3 z-10 rounded-md bg-error/90 px-1.5 py-0.5 text-[9px] font-bold text-white">Алдаа</span>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumb} alt={item.label} className="h-28 w-full rounded-xl bg-surface object-contain" />
                <input value={item.label} onChange={(e) => update(item.id, { label: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--glass-border)] bg-surface px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-brand" />
                <div className="mt-1 flex items-center gap-1">
                  <select value={STUDIO_CATEGORY_KEYS.includes(item.category) ? item.category : 'бусад'} onChange={(e) => update(item.id, { category: e.target.value })} className="flex-1 rounded-lg border border-[var(--glass-border)] bg-surface px-2 py-1 text-[11px] text-foreground outline-none">
                    {STUDIO_CATEGORY_KEYS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="text-[10px] text-foreground-muted">{item.confidence}%</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => void generateAndSave()} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand-hover disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? `Боловсруулж байна... (${savedCount}/${selectedCount})` : `✨ ${selectedCount} барааг студио болгож хадгалах`}
          </button>
        </div>
      )}
    </div>
  );
}
