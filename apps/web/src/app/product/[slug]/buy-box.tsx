'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { useWishlistStore } from '@/lib/wishlist-store';

// ─── Static data ─────────────────────────────────────────────

const STORES = [
  { id: '1', name: 'Баянзүрх салбар', address: 'Баянзүрх дүүрэг, Нарны зам 5' },
  { id: '2', name: 'Сүхбаатар салбар', address: 'Сүхбаатар дүүрэг, Бага тойруу 14' },
  { id: '3', name: 'Хан-Уул салбар', address: 'Хан-Уул дүүрэг, Зайсан 12' },
  { id: '4', name: 'Баянгол салбар', address: 'Баянгол дүүрэг, Чингисийн өргөн чөлөө 8' },
  { id: '5', name: 'Чингэлтэй салбар', address: 'Чингэлтэй дүүрэг, Энхтайваны өргөн чөлөө 3' },
];

const DISTRICTS: { name: string; estimate: string }[] = [
  { name: 'Баянзүрх дүүрэг', estimate: '2–4 цагт' },
  { name: 'Сүхбаатар дүүрэг', estimate: '2–4 цагт' },
  { name: 'Хан-Уул дүүрэг', estimate: '3–5 цагт' },
  { name: 'Баянгол дүүрэг', estimate: '2–4 цагт' },
  { name: 'Чингэлтэй дүүрэг', estimate: '2–4 цагт' },
  { name: 'Сонгинохайрхан дүүрэг', estimate: '4–6 цагт' },
  { name: 'Налайх дүүрэг', estimate: '6–8 цагт' },
  { name: 'Багануур дүүрэг', estimate: '1–2 өдөрт' },
  { name: 'Багахангай дүүрэг', estimate: '1–2 өдөрт' },
];

// ─── Types ───────────────────────────────────────────────────

export interface ProductOption {
  id: string;
  name: string;
  code: string;
  group: { id: string; name: string; code: string };
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  priceWithTax: number;
  currencyCode: string;
  stockLevel: string;
  options: ProductOption[];
}

export interface OptionGroup {
  id: string;
  name: string;
  code: string;
  options: { id: string; name: string; code: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────

function formatMNT(minor: number) {
  return `₮${Math.round(minor / 100).toLocaleString('mn-MN')}`;
}

function findVariant(
  variants: ProductVariant[],
  selected: Record<string, string>,
): ProductVariant | undefined {
  return variants.find((v) =>
    v.options.every((o) => selected[o.group.code] === o.code),
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`h-4 w-4 ${i < Math.round(rating) ? 'text-amber' : 'text-foreground-muted/30'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-foreground-muted">{count} сэтгэгдэл</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────

export default function BuyBox({
  productId,
  productName,
  slug,
  image,
  variants,
  optionGroups,
  avgRating = 0,
  reviewCount = 0,
}: {
  productId: string;
  productName: string;
  slug: string;
  image: string | null;
  variants: ProductVariant[];
  optionGroups: OptionGroup[];
  avgRating?: number;
  reviewCount?: number;
}) {
  // Initialise selected options from first variant's options
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    optionGroups.reduce<Record<string, string>>((acc, g) => {
      acc[g.code] = g.options[0]?.code ?? '';
      return acc;
    }, {}),
  );
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState<'pickup' | 'delivery'>('delivery');
  const [storeId, setStoreId] = useState(STORES[0].id);
  const [district, setDistrict] = useState(DISTRICTS[0].name);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const { addItem: addToWishlist, removeItem: removeFromWishlist, hasItem } = useWishlistStore();

  const addBtnRef = useRef<HTMLButtonElement>(null);

  // Show sticky bottom bar when the main button scrolls out of view
  useEffect(() => {
    const el = addBtnRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const activeVariant =
    optionGroups.length > 0
      ? findVariant(variants, selectedOptions)
      : variants[0];

  const inStock =
    !activeVariant || activeVariant.stockLevel !== 'OUT_OF_STOCK';
  const wishlisted = hasItem(activeVariant?.id ?? variants[0]?.id ?? '');

  const price = activeVariant?.priceWithTax ?? variants[0]?.priceWithTax ?? 0;

  const deliveryEstimate =
    DISTRICTS.find((d) => d.name === district)?.estimate ?? '2–4 цагт';

  function handleAddToCart() {
    if (!activeVariant) return;
    addItem({
      productId,
      variantId: activeVariant.id,
      name: productName,
      slug,
      image,
      price: activeVariant.priceWithTax,
      currencyCode: activeVariant.currencyCode || 'MNT',
      qty,
      mode,
      storeId,
      sku: activeVariant.sku,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  return (
    <>
      <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 border border-[var(--glass-border)] lg:sticky lg:top-6">

        {/* Name + SKU */}
        <div>
          <h1 className="text-xl font-bold leading-snug text-foreground">{productName}</h1>
          {activeVariant?.sku && (
            <p className="mt-1 text-xs text-foreground-muted">Код: {activeVariant.sku}</p>
          )}
        </div>

        {/* Rating */}
        <StarRating rating={avgRating} count={reviewCount} />

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-extrabold text-foreground">{formatMNT(price)}</span>
          {/* Strike-through shown when a sale price exists; stubbed for now */}
        </div>

        {/* Promo + warranty badges */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-3 py-1 text-xs font-medium text-red-600">
            🏷️ Хямдрал
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-3 py-1 text-xs font-medium text-info">
            🛡️ 12 сарын баталгаа
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
            ✅ Оригинал бараа
          </span>
        </div>

        {/* Option groups (variants) */}
        {optionGroups.map((group) => (
          <div key={group.id}>
            <p className="mb-2 text-sm font-semibold text-foreground-muted">{group.name}</p>
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => {
                const active = selectedOptions[group.code] === opt.code;
                return (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setSelectedOptions((prev) => ({ ...prev, [group.code]: opt.code }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'border-brand bg-brand/5 text-amber-700'
                        : 'border-[var(--glass-border)] text-foreground-muted hover:border-amber-300'
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Pickup / Delivery toggle */}
        <div>
          <div className="flex overflow-hidden rounded-xl border border-[var(--glass-border)]">
            {(['delivery', 'pickup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold transition ${
                  mode === m
                    ? 'bg-brand text-white'
                    : 'bg-card text-foreground-muted hover:bg-dark'
                }`}
              >
                {m === 'delivery' ? '🚚 Хүргэлт' : '🏪 Дэлгүүрээс авах'}
              </button>
            ))}
          </div>

          {/* Delivery — district selector */}
          {mode === 'delivery' && (
            <div className="mt-3 space-y-2">
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-[var(--glass-border)] bg-card px-3 py-2 text-sm text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
              <p className="text-sm text-foreground-muted">
                📍 <span className="font-medium">{district}</span>-д{' '}
                <span className="font-semibold text-success">{deliveryEstimate}</span> хүргэнэ
              </p>
            </div>
          )}

          {/* Pickup — store selector */}
          {mode === 'pickup' && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Салбар сонгох</p>
              <div className="space-y-2">
                {STORES.map((store) => (
                  <label
                    key={store.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      storeId === store.id
                        ? 'border-amber-400 bg-brand/5'
                        : 'border-[var(--glass-border)] hover:border-[var(--glass-border)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="store"
                      value={store.id}
                      checked={storeId === store.id}
                      onChange={() => setStoreId(store.id)}
                      className="mt-0.5 accent-amber-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{store.name}</p>
                      <p className="text-xs text-foreground-muted">{store.address}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-foreground-muted">Тоо хэмжээ</span>
          <div className="flex items-center overflow-hidden rounded-xl border border-[var(--glass-border)]">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center text-lg font-bold text-foreground-muted hover:bg-surface disabled:text-foreground-muted/30"
              disabled={qty <= 1}
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-semibold text-foreground">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-10 w-10 items-center justify-center text-lg font-bold text-foreground-muted hover:bg-surface"
            >
              +
            </button>
          </div>
          {!inStock && (
            <span className="text-sm font-medium text-error">Байхгүй</span>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex gap-3">
          <button
            ref={addBtnRef}
            onClick={handleAddToCart}
            disabled={!inStock}
            className="flex-1 rounded-xl bg-brand py-3.5 text-sm font-bold text-white transition hover:bg-brand-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-surface disabled:text-foreground-muted"
          >
            {addedToCart ? '✅ Нэмэгдлээ!' : inStock ? 'Сагсанд нэмэх' : 'Захиалгаар'}
          </button>
          <button
            onClick={() => {
              const v = activeVariant ?? variants[0];
              if (!v) return;
              if (wishlisted) {
                removeFromWishlist(v.id);
              } else {
                addToWishlist({
                  productId,
                  variantId: v.id,
                  name: productName,
                  slug,
                  image: image ?? '',
                  price: v.priceWithTax,
                  currencyCode: 'MNT',
                  sku: v.sku,
                });
              }
            }}
            aria-label="Хадгалах"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition ${
              wishlisted
                ? 'border-red-200 bg-error/10 text-error'
                : 'border-[var(--glass-border)] text-foreground-muted hover:border-red-200 hover:text-error/70'
            }`}
          >
            <svg className="h-5 w-5" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[var(--glass-border)] bg-card/95 px-4 py-3 backdrop-blur-sm transition-transform duration-300 lg:hidden ${
          showStickyBar ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div>
          <p className="text-xs text-foreground-muted">Үнэ</p>
          <p className="text-lg font-extrabold text-foreground">{formatMNT(price)}</p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand-hover disabled:bg-surface disabled:text-foreground-muted"
        >
          {addedToCart ? '✅ Нэмэгдлээ!' : 'Сагсанд нэмэх'}
        </button>
      </div>
    </>
  );
}
