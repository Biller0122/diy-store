'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, CreditCard, Truck, CheckCircle, XCircle, Edit2, Printer, RotateCcw } from 'lucide-react';
import { MOCK_ORDERS } from '@/lib/admin-data';

const TIMELINE = [
  { state: 'PaymentAuthorized', label: 'Захиалга баталгаажсан', icon: CreditCard },
  { state: 'PaymentSettled',    label: 'Төлбөр хийгдсэн',       icon: CheckCircle },
  { state: 'Shipped',           label: 'Илгээсэн',               icon: Truck },
  { state: 'Delivered',         label: 'Хүргэсэн',               icon: CheckCircle },
];

const STATE_BADGE: Record<string, string> = {
  PaymentAuthorized: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PaymentSettled:    'bg-green-500/15 text-green-400 border-green-500/20',
  Shipped:           'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Delivered:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Cancelled:         'bg-red-500/15 text-red-400 border-red-500/20',
};
const STATE_LABEL: Record<string, string> = {
  PaymentAuthorized: 'Шинэ захиалга',
  PaymentSettled:    'Төлбөр хийгдсэн',
  Shipped:           'Илгээсэн',
  Delivered:         'Хүргэсэн',
  Cancelled:         'Цуцалсан',
};

const PAYMENT_LABEL: Record<string, string> = {
  qpay: 'QPay', monpay: 'MonPay', card: 'Карт',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('mn-MN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function stateIndex(state: string) {
  return TIMELINE.findIndex(t => t.state === state);
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = MOCK_ORDERS.find(o => o.id === id);

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground-muted">Захиалга олдсонгүй</p>
        <Link href="/admin/orders" className="text-brand text-sm hover:underline mt-2 inline-block">← Буцах</Link>
      </div>
    );
  }

  const currentIdx = stateIndex(order.state);
  const isCancelled = order.state === 'Cancelled';

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="p-2 rounded-xl hover:bg-white/5 text-foreground-muted transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-sm font-bold text-foreground">#{order.code}</h2>
          <p className="text-[10px] text-foreground-muted">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`ml-auto text-[10px] px-2.5 py-1 rounded-xl border ${STATE_BADGE[order.state] ?? 'bg-white/10 text-foreground-muted border-white/10'}`}>
          {STATE_LABEL[order.state] ?? order.state}
        </span>
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-foreground mb-4">Хүргэлтийн явц</h3>
          <div className="flex items-start gap-0">
            {TIMELINE.map((step, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step.state} className="flex-1 flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 transition-colors ${
                    done ? 'bg-brand text-white' : 'bg-surface text-foreground-muted'
                  } ${active ? 'ring-2 ring-brand/40' : ''}`}>
                    <step.icon size={13} />
                  </div>
                  <p className={`text-[9px] text-center leading-tight ${done ? 'text-foreground' : 'text-foreground-muted'}`}>
                    {step.label}
                  </p>
                  {i < TIMELINE.length - 1 && (
                    <div className={`h-0.5 w-full mt-3 -mx-2 ${i < currentIdx ? 'bg-brand' : 'bg-[var(--glass-border)]'}`} style={{ marginTop: '-2.5rem', marginBottom: '2.5rem' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Customer */}
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin size={13} className="text-foreground-muted" /> Хэрэглэгч
          </h3>
          <p className="text-sm font-semibold text-foreground">
            {order.customer?.firstName} {order.customer?.lastName}
          </p>
          <p className="text-xs text-foreground-muted">{order.customer?.emailAddress}</p>
          {order.customer?.phoneNumber && (
            <p className="text-xs text-foreground-muted">{order.customer.phoneNumber}</p>
          )}
          {order.shippingAddress && (
            <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
              <p className="text-xs text-foreground-muted">Хүргэлтийн хаяг</p>
              <p className="text-xs text-foreground mt-1">
                {order.shippingAddress.streetLine1}, {order.shippingAddress.city}
              </p>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard size={13} className="text-foreground-muted" /> Төлбөр
          </h3>
          {order.payments?.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-foreground-muted">{PAYMENT_LABEL[p.method] ?? p.method}</span>
              <span className="font-semibold text-foreground">₮{Math.round(p.amount / 100).toLocaleString('mn-MN')}</span>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex justify-between text-sm font-bold">
            <span className="text-foreground">Нийт</span>
            <span className="text-foreground">₮{Math.round(order.totalWithTax / 100).toLocaleString('mn-MN')}</span>
          </div>
        </div>
      </div>

      {/* Order lines */}
      <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package size={13} className="text-foreground-muted" /> Захиалсан бараа
        </h3>
        <div className="space-y-3">
          {order.lines.map((line) => (
            <div key={line.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                <Package size={14} className="text-foreground-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{line.productVariant.product.name}</p>
                <p className="text-[10px] text-foreground-muted">{line.productVariant.sku} · {line.quantity} ш</p>
              </div>
              <p className="text-xs font-bold text-foreground shrink-0">
                ₮{Math.round((line.unitPriceWithTax * line.quantity) / 100).toLocaleString('mn-MN')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
          <Edit2 size={13} className="text-foreground-muted" /> Үйлдэл
        </h3>
        <div className="flex flex-wrap gap-2">
          {order.state === 'PaymentAuthorized' && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/15 text-brand text-xs font-semibold hover:bg-brand/25 transition-colors">
              <CheckCircle size={13} /> Баталгаажуулах
            </button>
          )}
          {order.state === 'PaymentSettled' && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 text-purple-400 text-xs font-semibold hover:bg-purple-500/25 transition-colors">
              <Truck size={13} /> Илгээсэн
            </button>
          )}
          {order.state === 'Shipped' && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors">
              <CheckCircle size={13} /> Хүргэгдсэн гэж тэмдэглэх
            </button>
          )}
          {!isCancelled && order.state !== 'Delivered' && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors">
              <XCircle size={13} /> Цуцлах
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 text-xs font-semibold hover:bg-amber-500/25 transition-colors">
            <RotateCcw size={13} /> Буцаалт
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface text-foreground-muted text-xs font-semibold hover:text-foreground transition-colors">
            <Printer size={13} /> Нэхэмжлэх хэвлэх
          </button>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <label className="text-xs text-foreground-muted">Tracking №:</label>
            <input
              defaultValue={order.customFields?.trackingNumber ?? ''}
              placeholder="EM123456789MN"
              className="px-2.5 py-1.5 rounded-lg border border-[var(--glass-border)] bg-surface text-xs text-foreground focus:outline-none focus:border-brand/50 w-36"
            />
            <button className="px-3 py-1.5 rounded-lg bg-brand/15 text-brand text-xs font-semibold hover:bg-brand/25 transition-colors">
              Хадгалах
            </button>
          </div>
        </div>

        {/* Note */}
        <div className="mt-4">
          <label className="text-xs text-foreground-muted block mb-1">Тэмдэглэл</label>
          <textarea
            defaultValue={order.customFields?.note ?? ''}
            placeholder="Дотоод admin тэмдэглэл..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-[var(--glass-border)] bg-surface text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-brand/50 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
