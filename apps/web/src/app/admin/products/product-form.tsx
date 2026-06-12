'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, FileText, GripVertical, ImagePlus, Plus, Save, Send, Trash2 } from 'lucide-react';
import { MOCK_PRODUCTS, type AdminProduct } from '@/lib/admin-data';
import { formatPrice } from '@/lib/price';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

type SpecRow = { key: string; value: string };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
    .replace(/-+/g, '-');
}

export default function ProductForm({ product }: { product?: AdminProduct }) {
  const firstVariant = product?.variants[0];
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [category, setCategory] = useState(product?.collections[0]?.name ?? 'Багаж хэрэгсэл');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState(firstVariant ? formatPrice(firstVariant.priceWithTax) : '');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState(firstVariant ? String(firstVariant.stockOnHand) : '');
  const [sku, setSku] = useState(firstVariant?.sku ?? '');
  const [pickup, setPickup] = useState(true);
  const [delivery, setDelivery] = useState(true);
  const [active, setActive] = useState(product?.enabled ?? true);
  const [specs, setSpecs] = useState<SpecRow[]>([{ key: 'Материал', value: '' }]);
  const [message, setMessage] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(MOCK_PRODUCTS.flatMap((p) => p.collections.map((c) => c.name)))),
    [],
  );

  function updateName(value: string) {
    setName(value);
    if (!product) setSlug(slugify(value));
  }

  function save(kind: 'draft' | 'publish') {
    setMessage(kind === 'draft' ? 'Ноорог хадгалагдлаа. Admin API бэлэн болмогц mutation ажиллана.' : 'Нийтлэх хүсэлт үүслээ. Admin API бэлэн болмогц mutation ажиллана.');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="rounded-xl p-2 text-foreground-muted hover:bg-white/5 hover:text-foreground">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-base font-bold text-foreground">{product ? 'Бараа засах' : 'Бараа нэмэх'}</h2>
          <p className="text-xs text-foreground-muted">Vendure Admin API mutation-д холбогдох бэлэн form</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => save('draft')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground">
            <Save size={14} /> Ноорог
          </button>
          <button onClick={() => save('publish')} className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover">
            <Send size={14} /> Нийтлэх
          </button>
        </div>
      </div>

      {message && <div className="rounded-xl border border-brand/20 bg-brand/10 px-4 py-3 text-xs text-brand">{message}</div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Үндсэн мэдээлэл</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs text-foreground-muted">Нэр</span>
                <input value={name} onChange={(e) => updateName(e.target.value)} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-foreground-muted">Slug</span>
                <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-foreground-muted">SKU код</span>
                <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-foreground-muted">Ангилал</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50">
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-foreground-muted">Брэнд</span>
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50" />
              </label>
            </div>
            <div className="mt-4" data-color-mode="dark">
              <span className="mb-1.5 block text-xs text-foreground-muted">Тайлбар</span>
              <MDEditor value={description} onChange={(value) => setDescription(value ?? '')} height={260} preview="edit" />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Техникийн үзүүлэлт</h3>
              <button onClick={() => setSpecs([...specs, { key: '', value: '' }])} className="inline-flex items-center gap-1 rounded-lg bg-brand/15 px-2.5 py-1.5 text-xs font-semibold text-brand">
                <Plus size={13} /> Мөр
              </button>
            </div>
            <div className="space-y-2">
              {specs.map((row, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[24px_1fr_1fr_36px]">
                  <GripVertical className="mt-2 text-foreground-muted" size={15} />
                  <input value={row.key} onChange={(e) => setSpecs(specs.map((s, i) => i === index ? { ...s, key: e.target.value } : s))} placeholder="Үзүүлэлт" className="rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none" />
                  <input value={row.value} onChange={(e) => setSpecs(specs.map((s, i) => i === index ? { ...s, value: e.target.value } : s))} placeholder="Утга" className="rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none" />
                  <button onClick={() => setSpecs(specs.filter((_, i) => i !== index))} className="rounded-xl text-foreground-muted hover:bg-error/10 hover:text-error"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Үнэ ба нөөц</h3>
            <div className="space-y-3">
              {[
                ['Үнэ', price, setPrice],
                ['Хямдралтай үнэ', salePrice, setSalePrice],
                ['Нөөц тоо', stock, setStock],
              ].map(([label, value, setter]) => (
                <label key={label as string} className="block space-y-1.5">
                  <span className="text-xs text-foreground-muted">{label as string}</span>
                  <input value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50" />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Зураг ба файл</h3>
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--glass-border)] bg-surface text-center hover:border-brand/40">
              <ImagePlus className="mb-2 text-foreground-muted" size={24} />
              <span className="text-xs font-semibold text-foreground">Зураг чирж оруулах</span>
              <span className="text-[10px] text-foreground-muted">Олон зураг сонгож болно</span>
              <input type="file" multiple accept="image/*" className="hidden" />
            </label>
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-xs text-foreground-muted hover:text-foreground">
              <FileText size={14} /> PDF баримт бичиг upload
              <input type="file" multiple accept="application/pdf" className="hidden" />
            </label>
          </div>

          <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Тохиргоо</h3>
            {[
              ['Pickup боломжтой', pickup, setPickup],
              ['Хүргэлт боломжтой', delivery, setDelivery],
              ['Идэвхтэй', active, setActive],
            ].map(([label, checked, setter]) => (
              <label key={label as string} className="mb-3 flex items-center justify-between text-xs text-foreground-muted">
                {label as string}
                <input type="checkbox" checked={checked as boolean} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} className="h-4 w-4 accent-brand" />
              </label>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
