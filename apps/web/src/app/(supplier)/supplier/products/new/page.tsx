'use client';

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, Package, Save } from 'lucide-react';
import { useSupplierStore } from '@/lib/supplier-store';
import { vendureShopFetch } from '@/lib/vendure';

type FormState = {
  name: string;
  slug: string;
  price: string;
  originalPrice: string;
  stock: string;
  category: string;
  description: string;
  image: string;
  imageName: string;
  inStock: boolean;
};

type SupplierProduct = {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  inStock: boolean;
};

const INITIAL_FORM: FormState = {
  name: '',
  slug: '',
  price: '',
  originalPrice: '',
  stock: '1',
  category: '',
  description: '',
  image: '',
  imageName: '',
  inStock: true,
};

const CREATE_SUPPLIER_PRODUCT_MUTATION = `
  mutation CreateSupplierProduct($input: SupplierProductInput!) {
    createSupplierProduct(input: $input) {
      id
      name
      slug
    }
  }
`;

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizePrice(value: string) {
  return Number(value.replace(/[^\d]/g, ''));
}

export default function NewSupplierProductPage() {
  const router = useRouter();
  const { supplier } = useSupplierStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const storageKey = useMemo(() => `diy-supplier-products:${supplier?.id ?? 'guest'}`, [supplier?.id]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !prev.slug) next.slug = makeSlug(String(value));
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Зөвхөн зураг файл сонгоно уу' }));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Зураг 4MB-аас бага байх ёстой' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        image: String(reader.result ?? ''),
        imageName: file.name,
      }));
      setErrors((prev) => ({ ...prev, image: '' }));
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setField('image', '');
    setField('imageName', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function validate() {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Барааны нэр оруулна уу';
    if (!form.slug.trim()) next.slug = 'Slug автоматаар үүсэхгүй бол гараар оруулна уу';
    if (normalizePrice(form.price) <= 0) next.price = 'Үнэ зөв оруулна уу';
    if (form.originalPrice && normalizePrice(form.originalPrice) <= normalizePrice(form.price)) {
      next.originalPrice = 'Хямдралын өмнөх үнэ үндсэн үнээс их байх ёстой';
    }
    if (Number(form.stock) < 0 || Number.isNaN(Number(form.stock))) next.stock = 'Нөөцийн тоо зөв оруулна уу';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    if (!supplier?.id) {
      setErrors((prev) => ({ ...prev, submit: 'Нэвтрэлтийн мэдээлэл олдсонгүй' }));
      return;
    }

    const product: SupplierProduct = {
      id: `local-${Date.now()}`,
      variantId: `local-v-${Date.now()}`,
      name: form.name.trim(),
      slug: form.slug.trim(),
      image: form.image.trim(),
      price: normalizePrice(form.price) * 100,
      originalPrice: form.originalPrice ? normalizePrice(form.originalPrice) * 100 : undefined,
      rating: 0,
      reviewCount: 0,
      badge: 'ШИНЭ',
      inStock: form.inStock && Number(form.stock) > 0,
    };

    setSaving(true);
    try {
      await vendureShopFetch(CREATE_SUPPLIER_PRODUCT_MUTATION, {
        input: {
          supplierId: supplier.id,
          name: product.name,
          slug: product.slug,
          image: product.image,
          price: product.price,
          originalPrice: product.originalPrice,
          stock: Number(form.stock),
          category: form.category.trim(),
          description: form.description.trim(),
          enabled: product.inStock,
        },
      });
      router.push('/supplier/products');
    } catch (err) {
      const current = JSON.parse(localStorage.getItem(storageKey) || '[]') as SupplierProduct[];
      localStorage.setItem(storageKey, JSON.stringify([product, ...current]));
      setErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? `${err.message}. Түр local хадгаллаа.` : 'Server алдаа. Түр local хадгаллаа.',
      }));
      window.setTimeout(() => router.push('/supplier/products'), 900);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/supplier/products" className="rounded-xl p-2 text-foreground-muted hover:bg-white/5 hover:text-foreground">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-foreground">Бараа нэмэх</h2>
            <p className="mt-0.5 text-sm text-foreground-muted">Дэлгүүрт харагдах барааны үндсэн мэдээлэл</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4 md:p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-semibold text-foreground">Барааны нэр *</span>
            <input
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="Dulux EasyCare 4L Цагаан"
              className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand ${errors.name ? 'border-error' : 'border-[var(--glass-border)]'}`}
            />
            {errors.name && <p className="text-xs text-error">{errors.name}</p>}
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Slug *</span>
            <input
              value={form.slug}
              onChange={(event) => setField('slug', makeSlug(event.target.value))}
              placeholder="dulux-easycare-white"
              className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand ${errors.slug ? 'border-error' : 'border-[var(--glass-border)]'}`}
            />
            {errors.slug && <p className="text-xs text-error">{errors.slug}</p>}
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Ангилал</span>
            <input
              value={form.category}
              onChange={(event) => setField('category', event.target.value)}
              placeholder="Будаг"
              className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Үнэ *</span>
            <input
              value={form.price}
              onChange={(event) => setField('price', event.target.value)}
              inputMode="numeric"
              placeholder="59900"
              className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand ${errors.price ? 'border-error' : 'border-[var(--glass-border)]'}`}
            />
            {errors.price && <p className="text-xs text-error">{errors.price}</p>}
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Хямдралын өмнөх үнэ</span>
            <input
              value={form.originalPrice}
              onChange={(event) => setField('originalPrice', event.target.value)}
              inputMode="numeric"
              placeholder="69900"
              className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand ${errors.originalPrice ? 'border-error' : 'border-[var(--glass-border)]'}`}
            />
            {errors.originalPrice && <p className="text-xs text-error">{errors.originalPrice}</p>}
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Нөөц</span>
            <input
              value={form.stock}
              onChange={(event) => setField('stock', event.target.value)}
              inputMode="numeric"
              placeholder="12"
              className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand ${errors.stock ? 'border-error' : 'border-[var(--glass-border)]'}`}
            />
            {errors.stock && <p className="text-xs text-error">{errors.stock}</p>}
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Барааны зураг</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="rounded-xl border border-[var(--glass-border)] bg-surface p-3">
              {form.image ? (
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.image} alt="Барааны зураг" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{form.imageName || 'Сонгосон зураг'}</p>
                    <p className="mt-0.5 text-[11px] text-foreground-muted">Зураг бэлэн</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-white/10"
                      >
                        Солих
                      </button>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="rounded-lg bg-error/10 px-3 py-1.5 text-[11px] font-semibold text-error hover:bg-error/15"
                      >
                        Устгах
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--glass-border)] bg-card/40 px-4 py-5 text-center text-foreground-muted hover:border-brand/50 hover:text-foreground"
                >
                  <ImagePlus size={20} />
                  <span className="text-xs font-semibold">Төхөөрөмжөөс зураг сонгох</span>
                  <span className="text-[11px]">PNG, JPG, WEBP · 4MB хүртэл</span>
                </button>
              )}
            </div>
            {errors.image && <p className="text-xs text-error">{errors.image}</p>}
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-semibold text-foreground">Тайлбар</span>
            <textarea
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              rows={4}
              placeholder="Барааны тайлбар..."
              className="w-full resize-none rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setField('inStock', !form.inStock)}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
            form.inStock ? 'border-success/30 bg-success/10 text-success' : 'border-[var(--glass-border)] bg-surface text-foreground-muted'
          }`}
        >
          <span className="text-sm font-semibold">Бэлэн байгаа эсэх</span>
          <span className="text-xs">{form.inStock ? 'Бэлэн' : 'Дууссан'}</span>
        </button>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {errors.submit && <p className="mr-auto self-center text-xs text-error">{errors.submit}</p>}
          <Link href="/supplier/products" className="inline-flex items-center justify-center rounded-xl border border-[var(--glass-border)] px-5 py-3 text-sm font-semibold text-foreground-muted hover:bg-white/5 hover:text-foreground">
            Болих
          </Link>
          <button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand-hover disabled:opacity-60">
            <Save size={16} />
            {saving ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-[var(--glass-border)] bg-card/60 p-4">
        <div className="flex items-center gap-3 text-sm text-foreground-muted">
          <Package size={18} />
          <span>Бараа server database руу хадгалагдаж, web болон supplier app дээр нэгэн зэрэг харагдана.</span>
        </div>
      </div>
    </div>
  );
}
