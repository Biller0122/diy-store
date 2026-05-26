'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Navigation } from 'lucide-react';
import { useOrderStore, OrderStatus } from '@/lib/order-store';

const STATUS_STYLES: Record<OrderStatus, string> = {
  'Хүлээгдэж буй': 'bg-amber-500/10 text-amber-400',
  'Боловсруулж буй': 'bg-info/10 text-info',
  'Хүргэлтэнд': 'bg-purple-500/10 text-purple-400',
  'Хүргэгдсэн': 'bg-success/10 text-success',
  'Цуцлагдсан': 'bg-error/10 text-error',
};

const STATUS_ICON: Record<OrderStatus, string> = {
  'Хүлээгдэж буй': '🕐',
  'Боловсруулж буй': '⚙️',
  'Хүргэлтэнд': '🚚',
  'Хүргэгдсэн': '✅',
  'Цуцлагдсан': '❌',
};

const ACTIVE_STATUSES: OrderStatus[] = ['Хүлээгдэж буй', 'Боловсруулж буй', 'Хүргэлтэнд'];

const ALL_STATUSES: OrderStatus[] = [
  'Хүлээгдэж буй',
  'Боловсруулж буй',
  'Хүргэлтэнд',
  'Хүргэгдсэн',
  'Цуцлагдсан',
];

export default function OrdersPage() {
  const { orders } = useOrderStore();
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | 'Бүгд'>('Бүгд');

  useEffect(() => setHydrated(true), []);

  // Sort: active first, then by date descending
  const sorted = [...orders].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.includes(a.status) ? 0 : 1;
    const bActive = ACTIVE_STATUSES.includes(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime();
  });

  const filtered = filter === 'Бүгд' ? sorted : sorted.filter((o) => o.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Захиалгууд</h1>
        <span className="text-sm text-foreground-muted">{orders.length} нийт</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(['Бүгд', ...ALL_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-brand text-white'
                : 'bg-card text-foreground-muted border border-[var(--glass-border)] hover:border-brand/30'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {!hydrated && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      )}

      {hydrated && filtered.length === 0 && (
        <div className="bg-card rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-foreground-muted font-medium">Захиалга олдсонгүй</p>
          <Link
            href="/"
            className="mt-4 inline-block px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            Дэлгүүр хэсэх
          </Link>
        </div>
      )}

      {hydrated && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isActive = ACTIVE_STATUSES.includes(order.status);
            const isDelivering = order.status === 'Хүргэлтэнд';
            return (
              <div
                key={order.code}
                className={`bg-card rounded-2xl p-5 border transition-all ${
                  isActive
                    ? 'border-brand/20 hover:border-brand/40'
                    : 'border-[var(--glass-border)] hover:shadow-xl hover:shadow-black/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {/* Active pulse indicator */}
                    {isActive && (
                      <div className="shrink-0 mt-1">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDelivering ? 'bg-purple-400' : 'bg-amber-400'}`} />
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDelivering ? 'bg-purple-500' : 'bg-amber-500'}`} />
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-foreground">#{order.code}</p>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        {new Date(order.placedAt).toLocaleString('mn-MN')}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[order.status]}`}>
                    {STATUS_ICON[order.status]} {order.status}
                  </span>
                </div>

                {/* Items preview */}
                <div className="flex gap-2 mb-3">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="w-12 h-12 rounded-lg bg-surface overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xs font-medium text-foreground-muted">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-foreground-muted">{order.items.length} бараа</span>
                    <span className="text-foreground-muted">·</span>
                    <span className="font-bold text-foreground">
                      ₮{Math.round(order.total / 100).toLocaleString('mn-MN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Link
                        href={`/track/${order.code}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors"
                      >
                        <Navigation size={12} /> Хянах
                      </Link>
                    )}
                    <Link
                      href={`/account/orders/${order.code}`}
                      className="px-3 py-1.5 rounded-xl border border-[var(--glass-border)] text-xs text-foreground-muted hover:text-foreground hover:border-brand/30 transition-colors"
                    >
                      Дэлгэрэнгүй
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
