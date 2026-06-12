'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, MapPin, Package } from 'lucide-react';
import {
  useCartStore,
  getSupplierGroups,
  calcSubtotal,
  calcDiscount,
  calcDeliveryFee,
  type Address,
} from '@/lib/cart-store';
import { useDeliveryFee } from '@/hooks/useDeliveryFee';
import { trackViewCart, trackRemoveFromCart } from '@/lib/analytics/ga4';
import { useCustomerAddressStore } from '@/lib/customer-address-store';
import { isRenderableImageSrc, withImagePreset } from '@/lib/image-url';

const UB_DISTRICTS = [
  'Баянзүрх','Сүхбаатар','Хан-Уул','Баянгол',
  'Чингэлтэй','Сонгинохайрхан','Налайх','Багануур','Багахангай',
];

function fmt(minor: number) {
  return `₮${Math.round(minor / 100).toLocaleString('mn-MN')}`;
}

// ─── Empty cart ───────────────────────────────────────────────

function EmptyCart() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-30">
        <rect x="10" y="30" width="100" height="70" rx="8" stroke="currentColor" strokeWidth="3" className="text-foreground-muted" />
        <path d="M10 50h100" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-foreground-muted" />
        <circle cx="38" cy="108" r="8" stroke="currentColor" strokeWidth="3" className="text-foreground-muted" />
        <circle cx="82" cy="108" r="8" stroke="currentColor" strokeWidth="3" className="text-foreground-muted" />
        <path d="M30 30L40 10h40l10 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-foreground-muted" />
        <path d="M48 65l8 8 16-16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-foreground-muted" />
      </svg>
      <div>
        <h2 className="text-xl font-bold text-foreground">Таны сагс хоосон байна</h2>
        <p className="mt-1 text-sm text-foreground-muted">Хайлт хийж бараагаа олоод сагсандаа нэмэарэй</p>
      </div>
      <Link href="/" className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-hover">
        Дэлгүүр рүү буцах
      </Link>
    </div>
  );
}

// ─── Promo section ────────────────────────────────────────────

function PromoSection() {
  const { promo, applyPromo, removePromo } = useCartStore();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function handleApply() {
    const result = applyPromo(code);
    setMsg({ text: result.message, ok: result.success });
    if (result.success) setCode('');
  }

  return (
    <div className="rounded-2xl bg-card border border-[var(--glass-border)] p-4">
      <p className="mb-3 text-sm font-semibold text-foreground-muted">Промо код</p>
      {promo ? (
        <div className="flex items-center justify-between rounded-xl bg-brand/10 px-3 py-2">
          <span className="text-sm font-medium text-brand">🏷️ {promo.code} — {promo.label}</span>
          <button onClick={removePromo} className="text-xs text-foreground-muted hover:text-error">Хасах</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="Промо кодоо оруулна уу"
              className="flex-1 rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <button onClick={handleApply} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover">
              Хэрэглэх
            </button>
          </div>
          {msg && <p className={`mt-2 text-xs ${msg.ok ? 'text-success' : 'text-error'}`}>{msg.text}</p>}
        </>
      )}
    </div>
  );
}

// ─── Address input ────────────────────────────────────────────

function AddressInput({ value, onChange }: { value: Address | null; onChange: (a: Address) => void }) {
  const [open, setOpen] = useState(!value);
  const addr = value ?? { province: 'Улаанбаатар', district: '', khoroo: '', address: '', doorCode: '', note: '' };

  const inputCls = 'w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-brand';

  function update(patch: Partial<Address>) {
    const next = { ...addr, ...patch };
    onChange(next);
  }

  return (
    <div className="rounded-2xl bg-card border border-[var(--glass-border)] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={16} className="text-brand shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {value?.district ? `${value.district}, ${value.address || 'Хаяг нэмэх...'}` : 'Хүргэлтийн хаяг оруулах'}
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-foreground-muted shrink-0" /> : <ChevronDown size={16} className="text-foreground-muted shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-[var(--glass-border)] p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground-muted">Дүүрэг</label>
              <select
                className={inputCls}
                value={addr.district}
                onChange={(e) => update({ district: e.target.value })}
              >
                <option value="">Сонгох...</option>
                {UB_DISTRICTS.map((d) => <option key={d}>{d} дүүрэг</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground-muted">Хороо</label>
              <input className={inputCls} placeholder="1-р хороо" value={addr.khoroo}
                onChange={(e) => update({ khoroo: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground-muted">Дэлгэрэнгүй хаяг</label>
            <input className={inputCls} placeholder="Байр, давхар, тоот" value={addr.address}
              onChange={(e) => update({ address: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground-muted">Хаалганы код</label>
              <input className={inputCls} placeholder="#1234" value={addr.doorCode ?? ''}
                onChange={(e) => update({ doorCode: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground-muted">Тэмдэглэл</label>
              <input className={inputCls} placeholder="Жишээ: 3-р давхар" value={addr.note ?? ''}
                onChange={(e) => update({ note: e.target.value })} />
            </div>
          </div>
          {addr.district && addr.address && (
            <button onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-brand/10 border border-brand/30 py-2 text-sm font-semibold text-brand hover:bg-brand/20">
              Хаяг хадгалах ✓
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fee breakdown ────────────────────────────────────────────

function FeeBreakdownPanel({ breakdown, isLoading }: {
  breakdown: ReturnType<typeof useDeliveryFee>['breakdown'];
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!breakdown) return null;

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-foreground-muted hover:text-brand">
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Хүргэлтийн тооцоо харах
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-xl bg-surface/50 p-3 text-xs">
          {isLoading && <p className="text-foreground-muted animate-pulse">Тооцоолж байна...</p>}
          <div className="flex justify-between text-foreground-muted">
            <span>Үндсэн төлбөр</span>
            <span>{fmt(breakdown.baseFee)}</span>
          </div>
          <div className="flex justify-between text-foreground-muted">
            <span>Зайны төлбөр ({breakdown.totalDistanceKm} км)</span>
            <span>{fmt(breakdown.distanceFee)}</span>
          </div>
          {breakdown.multiStopFee > 0 && (
            <div className="flex justify-between text-foreground-muted">
              <span>Олон нийлүүлэгч</span>
              <span>{fmt(breakdown.multiStopFee)}</span>
            </div>
          )}
          {breakdown.weightFee > 0 && (
            <div className="flex justify-between text-foreground-muted">
              <span>Хүнд ачаа</span>
              <span>{fmt(breakdown.weightFee)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Order summary ────────────────────────────────────────────

function OrderSummary({
  onCheckout,
  deliveryFee,
  feeBreakdown,
  feeFallback,
  feeLoading,
}: {
  onCheckout: () => void;
  deliveryFee: number;
  feeBreakdown: ReturnType<typeof useDeliveryFee>['breakdown'];
  feeFallback: boolean;
  feeLoading: boolean;
}) {
  const { items, promo } = useCartStore();
  const sub = calcSubtotal(items);
  const hasDelivery = items.some((i) => i.mode === 'delivery');
  const delivery = hasDelivery ? deliveryFee : 0;
  const discount = calcDiscount(sub, promo);
  const total = sub + delivery - discount;

  return (
    <div className="rounded-2xl bg-card border border-[var(--glass-border)] p-5">
      <h2 className="mb-4 text-base font-bold text-foreground">Захиалгын дүн</h2>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-foreground-muted">Барааны нийт</span>
          <span className="font-medium text-foreground">{fmt(sub)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-muted">Хүргэлт</span>
          <span className={`font-medium ${feeLoading ? 'animate-pulse text-foreground-muted' : 'text-foreground'}`}>
            {hasDelivery ? fmt(delivery) : 'Үнэгүй'}
          </span>
        </div>
        {hasDelivery && feeFallback && (
          <p className="text-xs text-amber-400">Ойролцоо төлбөр. Эцсийн төлбөр хүргэлтийн үед баталгаажна.</p>
        )}
        {hasDelivery && <FeeBreakdownPanel breakdown={feeBreakdown} isLoading={feeLoading} />}
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-foreground-muted">Хямдрал ({promo?.label})</span>
            <span className="font-medium text-success">−{fmt(discount)}</span>
          </div>
        )}
      </div>

      <div className="my-4 border-t border-dashed border-[var(--glass-border)]" />
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground">Нийт төлөх</span>
        <span className="text-xl font-extrabold text-brand">{fmt(total)}</span>
      </div>

      <button onClick={onCheckout}
        className="mt-4 w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow hover:bg-brand-hover active:scale-95 transition">
        Төлбөр үргэлжлүүлэх →
      </button>
      <Link href="/" className="mt-3 block text-center text-xs text-foreground-muted hover:text-brand">
        Дэлгүүр рүү буцах
      </Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function CartPage() {
  const [hydrated, setHydrated] = useState(false);
  const { items, removeItem, updateQty, updateMode, customerAddress, setCustomerAddress, updateDeliveryFee, deliveryFee, feeBreakdown, promo } = useCartStore();
  const addresses = useCustomerAddressStore((state) => state.addresses);
  const router = useRouter();

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || customerAddress) return;
    const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (!defaultAddress) return;
    setCustomerAddress({
      province: 'Улаанбаатар',
      district: `${defaultAddress.district} дүүрэг`,
      khoroo: defaultAddress.street,
      address: [defaultAddress.building, defaultAddress.apartment].filter(Boolean).join(', '),
      note: defaultAddress.label,
    });
  }, [addresses, customerAddress, hydrated, setCustomerAddress]);

  const deliveryItems = items.filter((item) => item.mode === 'delivery');
  const groups = getSupplierGroups(items);
  const deliveryGroups = getSupplierGroups(deliveryItems);
  const sub = calcSubtotal(items);
  const hasDelivery = deliveryItems.length > 0;

  // Build delivery fee params from supplier groups
  const feeParams = hasDelivery && deliveryGroups.length > 0 ? {
    pickupStops: deliveryGroups.map((g) => ({
      supplierId: g.supplierId,
      lat: g.supplierLat,
      lng: g.supplierLng,
      district: g.supplierDistrict,
    })),
    dropoff: {
      lat: customerAddress?.lat,
      lng: customerAddress?.lng,
      district: customerAddress?.district,
      address: customerAddress?.address,
    },
    totalWeightKg: deliveryItems.reduce((sum, item) => sum + item.qty, 0),
  } : null;

  const { fee, breakdown, fallback, isLoading } = useDeliveryFee(feeParams);

  // Sync calculated fee into store
  useEffect(() => {
    if (hasDelivery) {
      updateDeliveryFee(fee, breakdown ?? undefined);
    }
  }, [fee, breakdown, hasDelivery]); // eslint-disable-line react-hooks/exhaustive-deps

  const discount = calcDiscount(sub, promo);
  const delivery = hasDelivery ? fee : 0;
  const total = sub + delivery - discount;

  useEffect(() => {
    if (hydrated && items.length > 0) {
      trackViewCart(items.map((i) => ({ id: i.productId, variantId: i.variantId, name: i.name, price: i.price, qty: i.qty })), total);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="min-h-screen bg-dark px-4 py-10"><EmptyCart /></div>;
  }

  return (
    <div className="min-h-screen bg-dark pb-24 lg:pb-8">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] bg-surface/50 backdrop-blur-sm px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">
            🛒 Миний сагс
            <span className="ml-2 text-sm font-normal text-foreground-muted">({items.length} бараа)</span>
          </h1>
          <Link href="/" className="text-sm text-brand hover:underline">Дэлгүүр рүү буцах</Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl gap-6 px-4 py-6 lg:grid lg:grid-cols-[1fr_340px]">
        {/* Left — items by supplier + address */}
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.supplierId} className="rounded-2xl bg-card border border-[var(--glass-border)] overflow-hidden">
              {/* Supplier header */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--glass-border)] bg-surface/30">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand/15 flex items-center justify-center">
                    <Package size={14} className="text-brand" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{group.supplierName}</span>
                  <span className="text-xs text-foreground-muted">({group.items.length} бараа)</span>
                </div>
                <span className="text-xs font-semibold text-foreground">{fmt(group.subtotal)}</span>
              </div>

              {/* Items */}
              <div className="divide-y divide-[var(--glass-border)]">
                {group.items.map((item) => (
                  <div key={item.id} data-testid="cart-item" className="flex gap-3 p-4">
                    <Link href={`/product/${item.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                      {isRenderableImageSrc(item.image) ? (
                        <Image src={withImagePreset(item.image!, 'thumb')} alt={item.name} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl text-foreground-muted">📦</div>
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/product/${item.slug}`} className="line-clamp-2 text-sm font-semibold text-foreground hover:text-brand">
                          {item.name}
                        </Link>
                        <button
                          onClick={() => { removeItem(item.id); trackRemoveFromCart({ id: item.productId, variantId: item.variantId, name: item.name, price: item.price, qty: item.qty }); }}
                          className="shrink-0 text-foreground-muted hover:text-error"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {item.sku && <p className="text-xs text-foreground-muted">Код: {item.sku}</p>}

                      {/* Delivery toggle */}
                      <div className="flex overflow-hidden rounded-lg border border-[var(--glass-border)] w-fit text-xs">
                        {(['delivery', 'pickup'] as const).map((m) => (
                          <button key={m} onClick={() => updateMode(item.id, m)}
                            className={`px-3 py-1 font-medium transition ${item.mode === m ? 'bg-brand text-white' : 'text-foreground-muted hover:bg-white/5'}`}>
                            {m === 'delivery' ? '🚚 Хүргэлт' : '🏪 Авах'}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-sm font-bold text-foreground">{fmt(item.price * item.qty)}</p>
                        <div className="flex items-center overflow-hidden rounded-lg border border-[var(--glass-border)]">
                          <button onClick={() => updateQty(item.id, item.qty - 1)} disabled={item.qty <= 1}
                            className="flex h-7 w-7 items-center justify-center text-foreground-muted hover:bg-surface disabled:opacity-40">−</button>
                          <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, item.qty + 1)}
                            className="flex h-7 w-7 items-center justify-center text-foreground-muted hover:bg-surface">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Delivery address */}
          {hasDelivery && (
            <AddressInput value={customerAddress} onChange={setCustomerAddress} />
          )}

          {/* Promo */}
          <PromoSection />
        </div>

        {/* Right — summary sticky */}
        <div className="mt-4 lg:mt-0">
          <div className="lg:sticky lg:top-6">
            <OrderSummary
              onCheckout={() => router.push('/checkout')}
              deliveryFee={fee}
              feeBreakdown={breakdown}
              feeFallback={fallback}
              feeLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--glass-border)] bg-surface/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <button onClick={() => router.push('/checkout')}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow hover:bg-brand-hover">
          Төлбөр үргэлжлүүлэх →
        </button>
      </div>
    </div>
  );
}
