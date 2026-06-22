'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { TrendingUp, ShoppingCart, Package, Star, ArrowRight, Clock } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useSupplierStore } from '@/lib/supplier-store';
import {
  useSupplierOrdersData,
  useSupplierProductsData,
  orderTotalFor,
  isNewOrder,
  isDeliveredOrder,
  LOW_STOCK_THRESHOLD,
  type SupplierOrderRaw,
} from '@/lib/supplier-dashboard';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING:              { label: 'Шинэ',       cls: 'bg-brand/15 text-brand' },
  ACCEPTED_BY_SUPPLIER: { label: 'Баталсан',   cls: 'bg-blue-500/15 text-blue-400' },
  DRIVER_ASSIGNED:      { label: 'Жолооч',     cls: 'bg-purple-500/15 text-purple-400' },
  ON_THE_WAY:           { label: 'Хүргэж байна', cls: 'bg-amber/15 text-amber' },
  DELIVERED:            { label: 'Хүргэгдсэн', cls: 'bg-success/15 text-success' },
};

function statusOf(order: SupplierOrderRaw) {
  return order.status === 'COMPLETED' ? 'DELIVERED'
    : order.status === 'IN_PROGRESS' ? 'ON_THE_WAY'
    : order.status === 'ACCEPTED' ? 'DRIVER_ASSIGNED'
    : order.supplierStatus === 'ACCEPTED' ? 'ACCEPTED_BY_SUPPLIER'
    : 'PENDING';
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-xs text-foreground-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-foreground-muted mt-0.5">{sub}</p>}
    </div>
  );
}

type TooltipPayload = { value: number };
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-foreground-muted mb-1">{label}</p>
      <p className="font-bold text-foreground">₮{payload[0].value.toLocaleString('mn-MN')}</p>
    </div>
  );
};

export default function SupplierDashboard() {
  const { supplier } = useSupplierStore();
  const supplierId = supplier?.id;
  const { data: orders = [], isLoading: ordersLoading } = useSupplierOrdersData();
  const { data: products = [] } = useSupplierProductsData();

  const stats = useMemo(() => {
    const productCount = products.length;
    const lowStock = products.filter((p) => p.enabled && p.stock < LOW_STOCK_THRESHOLD).length;
    const totalOrders = orders.length;
    const pending = orders.filter(isNewOrder).length;

    // 30 хоногийн орлого (₮, хүргэгдсэн захиалгаар)
    const keys: string[] = [];
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      keys.push(key);
      byDay.set(key, 0);
    }
    for (const order of orders) {
      if (!isDeliveredOrder(order)) continue;
      const d = new Date(order.createdAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (byDay.has(key)) byDay.set(key, byDay.get(key)! + orderTotalFor(order, supplierId) / 100);
    }
    const revenueData = keys.map((k) => ({ date: k, revenue: Math.round(byDay.get(k) ?? 0) }));
    const monthRevenue = revenueData.reduce((s, r) => s + r.revenue, 0);

    const recent = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return { productCount, lowStock, totalOrders, pending, revenueData, monthRevenue, recent };
  }, [orders, products, supplierId]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Сайн байна уу, {supplier?.ownerName ?? ''}!</h2>
        <p className="text-sm text-foreground-muted mt-1">{supplier?.businessName} · Өнөөдрийн тойм</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={TrendingUp} label="Сарын орлого" value={`₮${stats.monthRevenue.toLocaleString('mn-MN')}`} sub="Сүүлийн 30 хоног" color="bg-brand/15 text-brand" />
        <MetricCard icon={ShoppingCart} label="Нийт захиалга" value={String(stats.totalOrders)} sub={`${stats.pending} хүлээгдэж байна`} color="bg-blue-500/15 text-blue-400" />
        <MetricCard icon={Package} label="Нийт бараа" value={String(stats.productCount)} sub={stats.lowStock > 0 ? `${stats.lowStock} нөөц дутмаг` : 'Нөөц хангалттай'} color="bg-purple-500/15 text-purple-400 " />
        <MetricCard icon={Star} label="Дундаж үнэлгээ" value={String(supplier?.rating ?? 0)} sub={`${supplier?.reviewCount ?? 0} сэтгэгдэл`} color="bg-amber/15 text-amber" />
      </div>

      {/* Revenue chart */}
      <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">30 хоногийн орлого</h2>
          <Link href="/supplier/revenue" className="text-xs text-brand hover:underline flex items-center gap-1">
            Дэлгэрэнгүй <ArrowRight size={11} />
          </Link>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="supRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4500" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#FF4500" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#FF4500" strokeWidth={2} fill="url(#supRevGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Сүүлийн захиалгууд</h2>
          <Link href="/supplier/orders" className="text-xs text-brand hover:underline flex items-center gap-1">
            Бүгдийг харах <ArrowRight size={11} />
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <div className="py-10 text-center text-sm text-foreground-muted">
            {ordersLoading ? 'Уншиж байна...' : 'Одоогоор захиалга алга байна'}
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recent.map((order) => {
              const key = statusOf(order);
              const st = STATUS_LABEL[key] ?? { label: key, cls: 'bg-white/10 text-foreground-muted' };
              const total = orderTotalFor(order, supplierId);
              return (
                <Link key={order.id} href="/supplier/orders" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                    <ShoppingCart size={12} className="text-foreground-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">#{order.orderNumber || order.orderId}</p>
                    <p className="text-[10px] text-foreground-muted">{order.customerName || 'Хэрэглэгч'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-foreground-muted flex items-center gap-0.5">
                      <Clock size={9} /> {new Date(order.createdAt).toLocaleDateString('mn-MN')}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${st.cls}`}>{st.label}</span>
                    <p className="text-xs font-semibold text-foreground">₮{Math.round(total / 100).toLocaleString()}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
