'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrderStore, OrderStatus, PlacedOrder } from '@/lib/order-store';

const STATUS_STEPS: OrderStatus[] = [
  'Хүлээгдэж буй',
  'Боловсруулж буй',
  'Хүргэлтэнд',
  'Хүргэгдсэн',
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  'Хүлээгдэж буй': 'bg-amber/10 text-amber',
  'Боловсруулж буй': 'bg-info/10 text-info',
  'Хүргэлтэнд': 'bg-purple-500/10 text-purple-400',
  'Хүргэгдсэн': 'bg-success/10 text-success',
  'Цуцлагдсан': 'bg-error/10 text-error',
};

const PAYMENT_LABELS: Record<string, string> = {
  qpay: 'QPay',
  monpay: 'MonPay',
  card: 'Карт',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getOrder, updateStatus } = useOrderStore();
  const [order, setOrder] = useState<PlacedOrder | undefined>();
  const [hydrated, setHydrated] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnSubmitted, setReturnSubmitted] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setOrder(getOrder(id));
  }, [id, getOrder]);

  if (!hydrated) {
    return (
      <div className="bg-card rounded-2xl p-8 animate-pulse">
        <div className="h-6 bg-surface rounded w-40 mb-4" />
        <div className="h-4 bg-surface rounded w-64" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-card rounded-2xl p-12 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-foreground-muted font-medium">Захиалга олдсонгүй</p>
        <Link
          href="/account/orders"
          className="mt-4 inline-block px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold"
        >
          Буцах
        </Link>
      </div>
    );
  }

  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'Цуцлагдсан';
  const canReturn = order.status === 'Хүргэгдсэн';

  const handleReturnSubmit = () => {
    if (!returnReason.trim()) return;
    setReturnSubmitted(true);
    setReturnModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-foreground-muted hover:text-foreground-muted">
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">#{order.code}</h1>
          <p className="text-xs text-foreground-muted">
            {new Date(order.placedAt).toLocaleString('mn-MN')}
          </p>
        </div>
        <span
          className={`ml-auto shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[order.status]}`}
        >
          {order.status}
        </span>
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div className="bg-card rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-5">Захиалгын явц</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-surface" />
            <div className="space-y-6">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= stepIndex;
                const active = i === stepIndex;
                return (
                  <div key={step} className="flex items-center gap-4 relative">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center z-10 text-sm font-bold border-2 ${
                        done
                          ? 'bg-brand border-amber-500 text-white'
                          : 'bg-card border-[var(--glass-border)] text-foreground-muted'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${active ? 'text-brand' : done ? 'text-foreground' : 'text-foreground-muted'}`}
                      >
                        {step}
                      </p>
                      {active && (
                        <p className="text-xs text-foreground-muted mt-0.5">Одоогийн байдал</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-card rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Захиалгын бараа</h2>
        <div className="space-y-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-16 h-16 rounded-xl bg-surface overflow-hidden shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm line-clamp-2">{item.name}</p>
                <p className="text-xs text-foreground-muted mt-0.5">SKU: {item.sku}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-foreground-muted">{item.qty} ширхэг</span>
                  <span className="text-sm font-semibold text-foreground">
                    ₮{Math.round((item.price * item.qty) / 100).toLocaleString('mn-MN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-card rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Захиалгын дүн</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-foreground-muted">Төлбөрийн хэрэгсэл</dt>
            <dd className="font-medium">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</dd>
          </div>
          {order.deliveryAddress && (
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Хүргэлтийн хаяг</dt>
              <dd className="font-medium text-right max-w-[200px]">{order.deliveryAddress}</dd>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-[var(--glass-border)] font-bold text-base">
            <dt>Нийт дүн</dt>
            <dd className="text-brand">
              ₮{Math.round(order.total / 100).toLocaleString('mn-MN')}
            </dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/"
          className="flex-1 text-center py-3 border border-[var(--glass-border)] rounded-xl text-sm font-medium text-foreground hover:border-amber-400 transition-colors"
        >
          Дахин захиалах
        </Link>
        {canReturn && !returnSubmitted && (
          <button
            onClick={() => setReturnModalOpen(true)}
            className="flex-1 py-3 bg-error/10 text-error rounded-xl text-sm font-medium hover:bg-error/10 transition-colors"
          >
            Буцаалт хүсэх
          </button>
        )}
        {returnSubmitted && (
          <div className="flex-1 py-3 bg-success/10 text-success rounded-xl text-sm font-medium text-center">
            ✓ Буцаалт хүсэгдлээ
          </div>
        )}
      </div>

      {/* Return modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-foreground mb-4">Буцаалт хүсэх</h3>
            <p className="text-sm text-foreground-muted mb-4">
              Буцаалт хүссэн шалтгаанаа тайлбарлана уу. Бид 1-2 ажлын өдрийн дотор тантай холбоо барина.
            </p>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Шалтгаан бичнэ үү..."
              rows={4}
              className="w-full border border-[var(--glass-border)] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setReturnModalOpen(false)}
                className="flex-1 py-2.5 border border-[var(--glass-border)] rounded-xl text-sm font-medium"
              >
                Болих
              </button>
              <button
                onClick={handleReturnSubmit}
                disabled={!returnReason.trim()}
                className="flex-1 py-2.5 bg-error/100 text-white rounded-xl text-sm font-medium disabled:opacity-40"
              >
                Илгээх
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
