'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, Package, Save, Sparkles } from 'lucide-react';
import { useSupplierStore } from '@/lib/supplier-store';
import { vendureShopFetch } from '@/lib/vendure';
import {
  buildCategoryGroups,
  getCategoryDisplayName,
  isRootCollection,
  type ProductCategoryOption,
} from '@/lib/category-options';

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

type ProductAnalysis = {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  confidence?: number;
  error?: string;
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

const AI_ANALYZE_TIMEOUT_MS = 35000;

const CREATE_SUPPLIER_PRODUCT_MUTATION = `
  mutation CreateSupplierProduct($input: SupplierProductInput!) {
    createSupplierProduct(input: $input) {
      id
      name
      slug
    }
  }
`;

const PRODUCT_CATEGORIES_QUERY = `
  query ProductCategories {
    collections(options: { take: 100, sort: { position: ASC } }) {
      items {
        id
        name
        slug
        parentId
        parent { id name slug }
      }
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

function onlyDigits(value: string) {
  return value.replace(/[^\d]/g, '');
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}

function findCategorySlug(categories: ProductCategoryOption[], aiCategory?: string) {
  const normalized = normalizeText(aiCategory ?? '');
  if (!normalized) return '';

  const synonyms: Record<string, string[]> = {
    'цемент': ['цемент', 'cement', 'tsement', 'sement', 'барилга'],
    'төмөр': ['төмөр', 'tomor', 'armatur', 'арматур', 'rebar', 'металл'],
    'мод': ['мод', 'wood', 'банз'],
    'будаг': ['будаг', 'paint', 'лак', 'праймер'],
    'тоосго': ['тоосго', 'toosgo', 'tosgo', 'brick'],
    'сантехник': ['сантехник', 'ус', 'хоолой', 'холигч'],
    'цахилгаан': ['цахилгаан', 'кабель', 'led', 'розетка'],
    'багаж': ['багаж', 'tool', 'tools', 'өрөм', 'шлифлэгч'],
    'барилга': ['барилга', 'building', 'хавтан', 'элс', 'хучилт'],
  };

  const candidates = synonyms[normalized] ?? [normalized];
  const match = categories.find((category) => {
    const haystack = normalizeText(`${category.name} ${category.slug} ${category.parent?.name ?? ''} ${category.parent?.slug ?? ''}`);
    return candidates.some((candidate) => haystack.includes(normalizeText(candidate)));
  });
  return match?.slug ?? '';
}

function resizeImage(file: File, maxSize = 900, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Зураг уншихад алдаа гарлаа'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Зургийн формат буруу байна'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Зураг боловсруулах боломжгүй байна'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  });
}

export default function NewSupplierProductPage() {
  const router = useRouter();
  const { supplier } = useSupplierStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiStatus, setAiStatus] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const storageKey = useMemo(() => `diy-supplier-products:${supplier?.id ?? 'guest'}`, [supplier?.id]);

  useEffect(() => {
    let mounted = true;
    vendureShopFetch<{ collections: { items: ProductCategoryOption[] } }>(
      PRODUCT_CATEGORIES_QUERY,
      undefined,
      { revalidate: 0 },
    )
      .then((data) => {
        if (!mounted) return;
        const items = data.collections.items.filter((item) => !isRootCollection(item));
        setCategories(items);
      })
      .catch(() => {
        if (mounted) setCategories([]);
      })
      .finally(() => {
        if (mounted) setCategoryLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const categoryGroups = useMemo(() => buildCategoryGroups(categories), [categories]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !prev.slug) next.slug = makeSlug(String(value));
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Зөвхөн зураг файл сонгоно уу' }));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Зураг 12MB-аас бага байх ёстой' }));
      return;
    }

    try {
      const image = await resizeImage(file);
      setForm((prev) => ({
        ...prev,
        image,
        imageName: file.name,
      }));
      setErrors((prev) => ({ ...prev, image: '' }));
      void analyzeSelectedImage(image);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        image: err instanceof Error ? err.message : 'Зураг боловсруулахад алдаа гарлаа',
      }));
    }
  }

  async function analyzeSelectedImage(image = form.image) {
    if (!image) {
      setErrors((prev) => ({ ...prev, image: 'Эхлээд зураг сонгоно уу' }));
      return;
    }

    setAiAnalyzing(true);
    setAiStatus('AI зураг шинжилж байна...');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AI_ANALYZE_TIMEOUT_MS);
    try {
      const response = await fetch('/analyze-product', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      const result = (await response.json()) as ProductAnalysis;
      if (!response.ok || result.error) {
        throw new Error(result.error || `AI шинжилгээний алдаа: ${response.status}`);
      }

      const categorySlug = findCategorySlug(categories, result.category);
      setForm((prev) => ({
        ...prev,
        name: result.name?.trim() || prev.name,
        slug: prev.slug || makeSlug(result.name ?? ''),
        description: result.description?.trim()
          ? `${result.description.trim()}${result.unit ? `\nНэгж: ${result.unit}` : ''}`
          : prev.description,
        category: categorySlug || prev.category,
      }));
      setAiStatus(`AI санал бөглөлөө${typeof result.confidence === 'number' ? ` · итгэлцүүр ${result.confidence}%` : ''}`);
    } catch (err) {
      setAiStatus(err instanceof Error && err.name === 'AbortError' ? 'AI шинжилгээ хэт удаж байна. Дахин оролдоно уу.' : err instanceof Error ? err.message : 'AI шинжилгээ амжилтгүй боллоо');
    } finally {
      window.clearTimeout(timeout);
      setAiAnalyzing(false);
    }
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
    if (!form.category.trim()) next.category = 'Ангилал сонгоно уу';
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
            <span className="text-xs font-semibold text-foreground">Барааны код (SKU/slug) *</span>
            <input
              value={form.slug}
              onChange={(event) => setField('slug', makeSlug(event.target.value))}
              placeholder="dulux-easycare-white"
              className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand ${errors.slug ? 'border-error' : 'border-[var(--glass-border)]'}`}
            />
            <p className="text-[11px] text-foreground-muted">Main хуудсан дээр “Код” гэж харагдах ба product URL-д ашиглагдана.</p>
            {errors.slug && <p className="text-xs text-error">{errors.slug}</p>}
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Ангилал *</span>
            <select
              value={form.category}
              onChange={(event) => setField('category', event.target.value)}
              disabled={categoryLoading || categories.length === 0}
              className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand disabled:opacity-60 ${errors.category ? 'border-error' : 'border-[var(--glass-border)]'}`}
            >
              {categoryLoading ? (
                <option value="">Ангилал уншиж байна...</option>
              ) : categories.length === 0 ? (
                <option value="">Backend дээр ангилал алга</option>
              ) : (
                <>
                  <option value="">Ангилал сонгох</option>
                  {categoryGroups.map((group) => (
                    <optgroup key={group.parent.id} label={group.parent.name}>
                      <option value={group.parent.slug}>{group.parent.name} (үндсэн)</option>
                      {group.children.map((category) => (
                        <option key={category.id} value={category.slug}>
                          {`  ${category.name}`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              )}
            </select>
            {form.category && (
              <p className="text-[11px] text-foreground-muted">
                Сонгосон: {getCategoryDisplayName(categories.find((category) => category.slug === form.category) ?? {
                  id: form.category,
                  name: form.category,
                  slug: form.category,
                })}
              </p>
            )}
            {errors.category && <p className="text-xs text-error">{errors.category}</p>}
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Үнэ *</span>
            <input
              value={form.price}
              onChange={(event) => setField('price', onlyDigits(event.target.value))}
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
              onChange={(event) => setField('originalPrice', onlyDigits(event.target.value))}
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
              onChange={(event) => setField('stock', onlyDigits(event.target.value))}
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
                    <p className="mt-0.5 text-[11px] text-foreground-muted">{aiStatus || 'Зураг бэлэн'}</p>
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
                        onClick={() => analyzeSelectedImage()}
                        disabled={aiAnalyzing}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand/15 disabled:opacity-60"
                      >
                        <Sparkles size={12} />
                        {aiAnalyzing ? 'Танин байна...' : 'AI-р таних'}
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
            {!form.image && (
              <p className="text-[11px] text-foreground-muted">
                Зураг сонгомогц AI нэр, ангилал, тайлбарыг санал болгоно. Үнэ ба нөөцийг та өөрөө оруулна.
              </p>
            )}
            {errors.image && <p className="text-xs text-error">{errors.image}</p>}
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-semibold text-foreground">Барааны тайлбар / онцлог</span>
            <textarea
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              rows={4}
              placeholder="Main product page-ийн “Тайлбар” хэсэгт харагдах мэдээлэл..."
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
