'use client';

import { useState } from 'react';
import { Search, ChevronRight, Clock, CheckCircle2, Truck } from 'lucide-react';

const MOCK_ORDERS = [
  { id: 'ORD-2025-001', customer: 'Дорж Баатар', phone: '+97699112233', address: 'Баянзүрх, 5-р хороо', items: [{ name: 'Dulux 4L', qty: 2, price: 5990000 }], total: 11980000, status: 'PENDING', createdAt: '2025-05-26 09:12' },
  { id: 'ORD-2025-002', customer: 'Ганаа Нямдорж', phone: '+97699445566', address: 'Сүхбаатар, 8-р хороо', items: [{ name: 'Caparol 10L', qty: 1, price: 18990000 }, { name: 'Knauf праймер', qty: 2, price: 3990000 }], total: 26970000, status: 'ACCEPTED_BY_SUPPLIER', createdAt: '2025-05-26 08:44' },
  { id: 'ORD-2025-003', customer: 'Болд Энхбаяр', phone: '+97699778899', address: 'Хан-Уул, 14-р хороо', items: [{ name: 'Marshall 2.5L', qty: 3, price: 4990000 }], total: 14970000, status: 'DRIVER_ASSIGNED', createdAt: '2025-05-26 08:10' },
  { id: 'ORD-2025-004', customer: 'Сарнай Оюун', phone: '+97699001122', address: 'Баянгол, 3-р хороо', items: [{ name: 'Sadolin 1L', qty: 5, price: 2490000 }], total: 12450000, status: 'ON_THE_WAY', createdAt: '2025-05-26 07:30' },
  { id: 'ORD-2025-005', customer: 'Энхжаргал Д.', phone: '+97699334455', address: 'Чингэлтэй, 1-р хороо', items: [{ name: 'Dulux 4L', qty: 1, price: 5990000 }], total: 5990000, status: 'DELIVERED', createdAt: '2025-05-25 16:22' },
  { id: 'ORD-2025-006', customer: 'Мөнхбат С.', phone: '+97699667788', address: 'Баянзүрх, 10-р хороо', items: [{ name: 'Caparol 10L', qty: 2, price: 18990000 }], total: 37980000, status: 'DELIVERED', createdAt: '2025-05-25 14:10' },
];

const STATUS_STEPS = ['PENDING', 'ACCEPTED_BY_SUPPLIER', 'DRIVER_ASSIGNED', 'ON_THE_WAY', 'DELIVERED'];

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:              { label: 'Шинэ',           cls: 'bg-brand/15 text-brand',         icon: Clock },
  ACCEPTED_BY_SUPPLIER: { label: 'Баталсан',       cls: 'bg-blue-500/15 text-blue-400',   icon: CheckCircle2 },
  DRIVER_ASSIGNED:      { label: 'Жолооч',         cls: 'bg-purple-500/15 text-purple-400', icon: Truck },
  ON_THE_WAY:           { label: 'Хүргэж байна',   cls: 'bg-amber/15 text-amber',         icon: Truck },
  DELIVERED:            { label: 'Хүргэгдсэн',     cls: 'bg-success/15 text-success',     icon: CheckCircle2 },
};

const TABS = [
  { key: 'all', label: 'Бүгд' },
  { key: 'PENDING', label: 'Шинэ' },
  { key: 'ACCEPTED_BY_SUPPLIER', label: 'Баталсан' },
  { key: 'ON_THE_WAY', label: 'Хүргэж байна' },
  { key: 'DELIVERED', label: 'Дууссан' },
];

export default function SupplierOrdersPage() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = MOCK_ORDERS.filter((o) => {
    if (tab !== 'all' && o.status !== tab) return false;
    if (search && !o.customer.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleAccept(orderId: string) {
    // In production: call API to update status
    alert(`Захиалга #${orderId} баталгаажуулав`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Захиалгууд</h2>
          <p className="text-sm text-foreground-muted mt-0.5">{MOCK_ORDERS.length} нийт захиалга</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => {
          const count = t.key === 'all' ? MOCK_ORDERS.length : MOCK_ORDERS.filter((o) => o.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${tab === t.key ? 'bg-brand text-white' : 'bg-card border border-[var(--glass-border)] text-foreground-muted hover:text-foreground'}`}
            >
              {t.label}
              {count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-foreground-muted/15'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Захиалга хайх..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-[var(--glass-border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* Order list */}
      <div className="space-y-2">
        {filtered.map((order) => {
          const meta = STATUS_META[order.status] ?? { label: order.status, cls: 'bg-white/10 text-foreground-muted', icon: Clock };
          const StatusIcon = meta.icon;
          const isExpanded = expanded === order.id;

          return (
            <div key={order.id} className="bg-card border border-[var(--glass-border)] rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-4 hover:bg-white/2 transition-colors text-left"
                onClick={() => setExpanded(isExpanded ? null : order.id)}
              >
                <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
                  <StatusIcon size={16} className={meta.cls.split(' ')[1]} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">#{order.id}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5">{order.customer} · {order.createdAt}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">₮{Math.round(order.total / 100).toLocaleString()}</p>
                  <p className="text-[10px] text-foreground-muted">{order.items.length} бараа</p>
                </div>
                <ChevronRight size={14} className={`text-foreground-muted transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[var(--glass-border)] pt-3">
                  {/* Items */}
                  <div className="space-y-2 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{item.name} × {item.qty}</span>
                        <span className="font-semibold text-foreground">₮{Math.round(item.price * item.qty / 100).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Delivery info */}
                  <div className="text-xs text-foreground-muted mb-3">
                    <p>📍 {order.address}</p>
                    <p className="mt-1">📞 {order.phone}</p>
                  </div>

                  {/* Actions */}
                  {order.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(order.id)}
                        className="flex-1 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
                      >
                        Баталгаажуулах
                      </button>
                      <button className="px-4 py-2 rounded-xl bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors">
                        Цуцлах
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-card border border-[var(--glass-border)] rounded-2xl">
            <p className="text-5xl mb-3">📦</p>
            <p className="text-sm text-foreground-muted">Захиалга олдсонгүй</p>
          </div>
        )}
      </div>
    </div>
  );
}
