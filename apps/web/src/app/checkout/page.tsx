'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import { CheckCircle, Package, MapPin, Clock } from 'lucide-react';
import { useCartStore, calcSubtotal, calcDiscount, calcDeliveryFee } from '@/lib/cart-store';
import { useOrderStore } from '@/lib/order-store';
import { QPayModal } from '@/components/payment/QPayModal';
import { MonPayModal } from '@/components/payment/MonPayModal';
import { trackBeginCheckout, trackAddPaymentInfo } from '@/lib/analytics/ga4';

// ─── Constants ────────────────────────────────────────────────

const PROVINCES = [
  'Улаанбаатар','Архангай','Баян-Өлгий','Баянхонгор','Булган',
  'Говь-Алтай','Говьсүмбэр','Дархан-Уул','Дорноговь','Дорнод',
  'Дундговь','Завхан','Орхон','Өвөрхангай','Өмнөговь',
  'Сүхбаатар','Сэлэнгэ','Төв','Увс','Ховд','Хөвсгөл','Хэнтий',
];

const UB_DISTRICTS = [
  'Баянзүрх','Сүхбаатар','Хан-Уул','Баянгол',
  'Чингэлтэй','Сонгинохайрхан','Налайх','Багануур','Багахангай',
];

const STORES = [
  { id: '1', name: 'Баянзүрх салбар',  address: 'Баянзүрх дүүрэг, Нарны зам 5' },
  { id: '2', name: 'Сүхбаатар салбар', address: 'Сүхбаатар дүүрэг, Бага тойруу 14' },
  { id: '3', name: 'Хан-Уул салбар',   address: 'Хан-Уул дүүрэг, Зайсан 12' },
  { id: '4', name: 'Баянгол салбар',   address: 'Баянгол дүүрэг, Чингисийн өргөн чөлөө 8' },
  { id: '5', name: 'Чингэлтэй салбар', address: 'Чингэлтэй дүүрэг, Энхтайваны өргөн чөлөө 3' },
];

type DeliveryType  = 'delivery' | 'pickup';
type PaymentMethod = 'qpay' | 'monpay' | 'card';

function fmt(minor: number) {
  return `₮${Math.round(minor / 100).toLocaleString('mn-MN')}`;
}

function randOrderNo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'DIY-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Step bar ─────────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Мэдээлэл', 'Төлбөр', 'Баталгаа'];
  return (
    <div className="flex items-center justify-center gap-0 py-5">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done   = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                done ? 'bg-success text-white' : active ? 'bg-brand text-white' : 'bg-surface text-foreground-muted'
              }`}>
                {done ? '✓' : n}
              </div>
              <span className={`hidden text-xs sm:block ${active ? 'font-semibold text-brand' : 'text-foreground-muted'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-0.5 w-10 sm:w-16 rounded-full transition ${step > n ? 'bg-success' : 'bg-[var(--glass-border)]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────

function Field({ label, required, children, error }: {
  label: string; required?: boolean; children: React.ReactNode; error?: string; className?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-foreground-muted">
        {label}{required && <span className="ml-0.5 text-error">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-foreground-muted/50';

// ─── Step 1 — Contact + Address ───────────────────────────────

interface ContactData {
  name: string; phone: string; email: string;
  deliveryType: DeliveryType;
  province: string; district: string; khoroo: string; address: string; doorCode: string;
  storeId: string; note: string;
}

function StepContact({ data, onChange, onNext }: {
  data: ContactData; onChange: (d: Partial<ContactData>) => void; onNext: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof ContactData, string>>>({});

  function validate() {
    const e: typeof errors = {};
    if (data.name.trim().length < 2) e.name = 'Нэр 2-оос дээш тэмдэгттэй байх ёстой';
    const cleanPhone = data.phone.replace(/\D/g, '');
    if (!/^[6789]\d{7}$/.test(cleanPhone)) e.phone = 'Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой';
    if (data.deliveryType === 'delivery') {
      if (!data.province) e.province = 'Аймаг/хот сонгоно уу';
      if (!data.district) e.district = 'Дүүрэг оруулна уу';
      if (!data.address.trim()) e.address = 'Дэлгэрэнгүй хаяг оруулна уу';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const districts = data.province === 'Улаанбаатар' ? UB_DISTRICTS : [];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground-muted">Холбоо барих</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Нэр" required error={errors.name}>
            <input className={inputCls} placeholder="Овог Нэр" value={data.name}
              onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Утасны дугаар" required error={errors.phone}>
            <input className={inputCls} placeholder="8800 0000" value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })} />
          </Field>
          <Field label="И-мэйл" className="sm:col-span-2">
            <input className={inputCls} placeholder="example@mail.mn" value={data.email}
              onChange={(e) => onChange({ email: e.target.value })} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground-muted">Хүргэлтийн мэдээлэл</h2>
        <div className="mb-4 flex overflow-hidden rounded-xl border border-[var(--glass-border)]">
          {([['delivery','🚚 Хүргэлт'], ['pickup','🏪 Салбараас авах']] as const).map(([val, label]) => (
            <button key={val} onClick={() => onChange({ deliveryType: val })}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${data.deliveryType === val ? 'bg-brand text-white' : 'bg-card text-foreground-muted hover:bg-dark'}`}>
              {label}
            </button>
          ))}
        </div>

        {data.deliveryType === 'delivery' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Аймаг / Хот" required error={errors.province}>
              <select className={inputCls} value={data.province}
                onChange={(e) => onChange({ province: e.target.value, district: '' })}>
                <option value="">Сонгох...</option>
                {PROVINCES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Дүүрэг / Сум" required error={errors.district}>
              {districts.length > 0 ? (
                <select className={inputCls} value={data.district}
                  onChange={(e) => onChange({ district: e.target.value })}>
                  <option value="">Сонгох...</option>
                  {districts.map((d) => <option key={d}>{d} дүүрэг</option>)}
                </select>
              ) : (
                <input className={inputCls} placeholder="Сум/дүүрэг" value={data.district}
                  onChange={(e) => onChange({ district: e.target.value })} />
              )}
            </Field>
            <Field label="Хороо / Баг">
              <input className={inputCls} placeholder="1-р хороо" value={data.khoroo}
                onChange={(e) => onChange({ khoroo: e.target.value })} />
            </Field>
            <Field label="Дэлгэрэнгүй хаяг" required error={errors.address}>
              <input className={inputCls} placeholder="Байр, давхар, тоот" value={data.address}
                onChange={(e) => onChange({ address: e.target.value })} />
            </Field>
            <Field label="Хаалганы код">
              <input className={inputCls} placeholder="#1234" value={data.doorCode}
                onChange={(e) => onChange({ doorCode: e.target.value })} />
            </Field>
            <Field label="Тэмдэглэл">
              <input className={inputCls} placeholder="3-р давхар, хэн нэгэнд..." value={data.note}
                onChange={(e) => onChange({ note: e.target.value })} />
            </Field>
          </div>
        ) : (
          <Field label="Салбар сонгох">
            <div className="space-y-2">
              {STORES.map((s) => (
                <label key={s.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    data.storeId === s.id ? 'border-brand/50 bg-brand/5' : 'border-[var(--glass-border)] hover:border-brand/30'
                  }`}>
                  <input type="radio" name="store" value={s.id} checked={data.storeId === s.id}
                    onChange={() => onChange({ storeId: s.id })} className="mt-0.5 accent-brand" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-foreground-muted">{s.address}</p>
                  </div>
                </label>
              ))}
            </div>
          </Field>
        )}
      </section>

      <button onClick={() => { if (validate()) onNext(); }}
        className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-hover">
        Үргэлжлүүлэх →
      </button>
    </div>
  );
}

// ─── Step 2 — Payment ─────────────────────────────────────────

interface PaymentData {
  method: PaymentMethod | null;
  vatRequired: boolean;
  companyName: string;
  registerNo: string;
}

const METHOD_INFO: { id: PaymentMethod; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'qpay',   icon: '📱', label: 'QPay',   desc: 'QR кодоор төлнө',      color: 'border-brand/40 bg-brand/5' },
  { id: 'monpay', icon: '💳', label: 'MonPay', desc: 'MonPay апп-аар төлнө', color: 'border-sky-500/40 bg-sky-500/5' },
  { id: 'card',   icon: '🏦', label: 'Карт',   desc: 'Дебит / Кредит карт',  color: 'border-purple-500/40 bg-purple-500/5' },
];

function StepPayment({ data, total, onChange, onBack, onNext }: {
  data: PaymentData; total: number; onChange: (d: Partial<PaymentData>) => void; onBack: () => void; onNext: () => void;
}) {
  const [error, setError] = useState('');

  function handleConfirm() {
    if (!data.method) { setError('Төлбөрийн аргаа сонгоно уу'); return; }
    if (data.vatRequired && (!data.companyName || !data.registerNo)) {
      setError('Компанийн нэр болон регистрийн дугаар оруулна уу'); return;
    }
    setError('');
    onNext();
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground-muted">Төлбөрийн арга</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {METHOD_INFO.map((m) => (
            <button key={m.id} onClick={() => onChange({ method: m.id })}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition ${
                data.method === m.id ? m.color : 'border-[var(--glass-border)] hover:border-[var(--glass-border)]'
              }`}>
              <span className="text-3xl">{m.icon}</span>
              <span className="text-sm font-bold text-foreground">{m.label}</span>
              <span className="text-xs text-foreground-muted">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {data.method && (
        <div className="flex items-center gap-3 rounded-xl bg-surface border border-[var(--glass-border)] px-4 py-3">
          <span className="text-xl">{METHOD_INFO.find((m) => m.id === data.method)?.icon}</span>
          <div className="text-sm text-foreground-muted">
            {data.method === 'qpay'   && <><span className="text-foreground font-semibold">QPay</span> — Дараа QR код харагдана. Банкны аппаа бэлдээрэй.</>}
            {data.method === 'monpay' && <><span className="text-foreground font-semibold">MonPay</span> — Дараа QR код харагдана. MonPay апп-аа бэлдээрэй.</>}
            {data.method === 'card'   && <><span className="text-foreground font-semibold">Карт</span> — Дараагийн хуудсанд картын мэдээлэл оруулна уу.</>}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card p-4 border border-[var(--glass-border)]">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={data.vatRequired}
            onChange={(e) => onChange({ vatRequired: e.target.checked })} className="h-4 w-4 rounded accent-brand" />
          <span className="text-sm font-semibold text-foreground-muted">НӨАТ-ын баримт авах</span>
        </label>
        {data.vatRequired && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Компанийн нэр" required>
              <input className={inputCls} placeholder="ХХК нэр" value={data.companyName}
                onChange={(e) => onChange({ companyName: e.target.value })} />
            </Field>
            <Field label="Регистрийн дугаар" required>
              <input className={inputCls} placeholder="1234567" value={data.registerNo}
                onChange={(e) => onChange({ registerNo: e.target.value })} />
            </Field>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-foreground-muted">Нийт төлөх дүн</span>
        <span className="text-lg font-extrabold text-foreground">{fmt(total)}</span>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 rounded-xl border border-[var(--glass-border)] py-3 text-sm font-semibold text-foreground-muted hover:bg-dark">
          ← Буцах
        </button>
        <button onClick={handleConfirm}
          className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover">
          Төлбөр хийх ✓
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 — Confirmation ────────────────────────────────────

function StepConfirmation({ orderNo, estimatedMinutes, deliveryAddress }: {
  orderNo: string;
  estimatedMinutes: number;
  deliveryAddress?: string;
}) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center"
    >
      {/* Success icon */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle size={40} className="text-success" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold animate-bounce">
            ✓
          </div>
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground">Захиалга амжилттай!</h2>
          <p className="mt-1 text-sm text-foreground-muted">Таны захиалгыг хүлээн авлаа. Жолооч хайж байна...</p>
        </div>
      </div>

      {/* Order number */}
      <div className="rounded-2xl bg-surface border border-[var(--glass-border)] p-4">
        <p className="text-xs text-foreground-muted mb-1">Захиалгын дугаар</p>
        <p className="text-2xl font-black text-brand tracking-wider">{orderNo}</p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface border border-[var(--glass-border)] p-3 flex flex-col items-center gap-1.5">
          <Clock size={18} className="text-brand" />
          <p className="text-xs text-foreground-muted">Тооцоолсон хугацаа</p>
          <p className="text-sm font-bold text-foreground">~{estimatedMinutes} мин</p>
        </div>
        <div className="rounded-xl bg-surface border border-[var(--glass-border)] p-3 flex flex-col items-center gap-1.5">
          <MapPin size={18} className="text-brand" />
          <p className="text-xs text-foreground-muted">Хүргэх хаяг</p>
          <p className="text-xs font-semibold text-foreground line-clamp-2">{deliveryAddress ?? 'Салбараас авах'}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
        <p className="text-sm text-amber-400">Таны захиалгад жолооч хайж байна...</p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Link
          href={`/track/${orderNo}`}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-hover"
        >
          <Package size={16} /> Захиалга хянах
        </Link>
        <Link
          href="/account/orders"
          className="flex items-center justify-center w-full rounded-xl border border-[var(--glass-border)] py-3 text-sm font-semibold text-foreground-muted hover:bg-dark"
        >
          Захиалгуудын жагсаалт
        </Link>
      </div>
    </m.div>
  );
}

// ─── Main page ────────────────────────────────────────────────

const CONTACT_INIT: ContactData = {
  name: '', phone: '', email: '',
  deliveryType: 'delivery',
  province: 'Улаанбаатар', district: '', khoroo: '', address: '', doorCode: '',
  storeId: STORES[0].id, note: '',
};

const PAYMENT_INIT: PaymentData = { method: null, vatRequired: false, companyName: '', registerNo: '' };

export default function CheckoutPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [contact, setContact] = useState<ContactData>(CONTACT_INIT);
  const [payment, setPayment] = useState<PaymentData>(PAYMENT_INIT);
  const [orderNo, setOrderNo] = useState('');
  const [showQPay, setShowQPay] = useState(false);
  const [showMonPay, setShowMonPay] = useState(false);
  const { items, promo, deliveryFee, clearCart } = useCartStore();
  const { addOrder } = useOrderStore();

  useEffect(() => setHydrated(true), []);

  const sub      = calcSubtotal(items);
  const hasDelivery = items.some((i) => i.mode === 'delivery');
  const delivery = hasDelivery ? deliveryFee : 0;
  const discount = calcDiscount(sub, promo);
  const total    = sub + delivery - discount;

  // Estimated minutes from delivery fee calc (rough)
  const estimatedMinutes = 35;

  function goToPayment() {
    setStep(2);
    window.scrollTo(0, 0);
    trackBeginCheckout(items.map((i) => ({ id: i.productId, variantId: i.variantId, name: i.name, price: i.price, qty: i.qty })), total);
  }

  function createOrder(no: string) {
    addOrder({
      id: no,
      code: no,
      placedAt: new Date().toISOString(),
      status: 'Хүлээгдэж буй',
      total,
      items: items.map((item) => ({
        variantId: item.variantId,
        name: item.name,
        sku: item.sku,
        qty: item.qty,
        price: item.price,
        image: item.image ?? '',
      })),
      deliveryAddress: contact.deliveryType === 'delivery'
        ? `${contact.district}, ${contact.address}`
        : undefined,
      paymentMethod: payment.method ?? 'qpay',
    });
  }

  function handlePaymentConfirm() {
    const no = randOrderNo();
    setOrderNo(no);
    createOrder(no);

    const methodLabel = payment.method === 'qpay' ? 'QPay' : payment.method === 'monpay' ? 'MonPay' : 'Card';
    trackAddPaymentInfo(methodLabel as 'QPay' | 'MonPay' | 'Card');

    if (payment.method === 'qpay') {
      setShowQPay(true);
    } else if (payment.method === 'monpay') {
      setShowMonPay(true);
    } else if (payment.method === 'card') {
      clearCart();
      router.push(`/checkout/mock-psp?session=MOCK-CARD-${no}&order=${no}&amount=${Math.round(total / 100)}`);
    }
  }

  function handlePaymentSuccess() {
    clearCart();
    setStep(3);
    window.scrollTo(0, 0);
    setShowQPay(false);
    setShowMonPay(false);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-dark pb-10">
        {/* Header */}
        <div className="border-b border-[var(--glass-border)] bg-card">
          <div className="mx-auto max-w-2xl px-4">
            <div className="flex items-center justify-between py-4">
              <Link href="/cart" className="text-sm text-brand hover:underline">← Сагс</Link>
              <span className="text-base font-bold text-foreground">Захиалга оруулах</span>
              <span />
            </div>
            <StepBar step={step} />
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Mini summary (steps 1 & 2 only) */}
          {step !== 3 && items.length > 0 && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-card px-4 py-3 border border-[var(--glass-border)] text-sm">
              <span className="text-foreground-muted">{items.reduce((s, i) => s + i.qty, 0)} бараа</span>
              <span className="font-bold text-foreground">{fmt(total)}</span>
            </div>
          )}

          <div className="rounded-2xl bg-card p-5 border border-[var(--glass-border)]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <m.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <StepContact
                    data={contact}
                    onChange={(d) => setContact((c) => ({ ...c, ...d }))}
                    onNext={goToPayment}
                  />
                </m.div>
              )}
              {step === 2 && (
                <m.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <StepPayment
                    data={payment}
                    total={total}
                    onChange={(d) => setPayment((p) => ({ ...p, ...d }))}
                    onBack={() => setStep(1)}
                    onNext={handlePaymentConfirm}
                  />
                </m.div>
              )}
              {step === 3 && (
                <m.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <StepConfirmation
                    orderNo={orderNo}
                    estimatedMinutes={estimatedMinutes}
                    deliveryAddress={
                      contact.deliveryType === 'delivery'
                        ? `${contact.district}, ${contact.address}`
                        : undefined
                    }
                  />
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showQPay && (
          <QPayModal orderNo={orderNo} total={total} onSuccess={handlePaymentSuccess} onClose={() => setShowQPay(false)} />
        )}
        {showMonPay && (
          <MonPayModal orderNo={orderNo} total={total} onSuccess={handlePaymentSuccess} onClose={() => setShowMonPay(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
