'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { TrendingUp, ShoppingCart, Package, Star, ArrowRight, Clock } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useSupplierStore } from '@/lib/supplier-store';

// Mock data
function getMockRevenue() {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      revenue: Math.floor(300000 + Math.random() * 700000),
      orders: Math.floor(3 + Math.random() * 12),
    };
  });
  return days;
}

const MOCK_ORDERS = [
  { id: 'ORD-001', customer: 'Дорж Б.', total: 2890000, status: 'PENDING', time: '10 мин өмнө' },
  { id: 'ORD-002', customer: 'Ганаа Н.', total: 4590000, status: 'ACCEPTED_BY_SUPPLIER', time: '25 мин өмнө' },
  { id: 'ORD-003', customer: 'Болд Э.', total: 1290000, status: 'DELIVERED', time: '1 цаг өмнө' },
  { id: 'ORD-004', customer: 'Сарнай О.', total: 8990000, status: 'DELIVERED', time: '2 цаг өмнө' },
];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING:              { label: 'Шинэ',       cls: 'bg-brand/15 text-brand' },
  ACCEPTED_BY_SUPPLIER: { label: 'Баталсан',   cls: 'bg-blue-500/15 text-blue-400' },
  DRIVER_ASSIGNED:      { label: 'Жолооч',     cls: 'bg-purple-500/15 text-purple-400' },
  ON_THE_WAY:           { label: 'Хүргэж байна', cls: 'bg-amber/15 text-amber' },
  DELIVERED:            { label: 'Хүргэгдсэн', cls: 'bg-success/15 text-success' },
};

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
  const revenue = useMemo(() => getMockRevenue(), []);
  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = revenue.reduce((s, r) => s + r.orders, 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Сайн байна уу, {supplier?.ownerName}!</h2>
        <p className="text-sm text-foreground-muted mt-1">{supplier?.businessName} · Өнөөдрийн тойм</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={TrendingUp} label="Сарын орлого" value={`₮${(totalRevenue / 100).toLocaleString('mn-MN')}`} sub="vs өмнөх сар +8%" color="bg-brand/15 text-brand" />
        <MetricCard icon={ShoppingCart} label="Нийт захиалга" value={String(totalOrders)} sub="4 хүлээгдэж байна" color="bg-blue-500/15 text-blue-400" />
        <MetricCard icon={Package} label="Нийт бараа" value={String(supplier?.productCount ?? 312)} sub="3 нөөц дутмаг" color="bg-purple-500/15 text-purple-400 " />
        <MetricCard icon={Star} label="Дундаж үнэлгээ" value={String(supplier?.rating ?? 4.7)} sub={`${supplier?.reviewCount ?? 234} сэтгэгдэл`} color="bg-amber/15 text-amber" />
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
            <AreaChart data={revenue} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
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
        <div className="space-y-2">
          {MOCK_ORDERS.map((order) => {
            const st = STATUS_LABEL[order.status] ?? { label: order.status, cls: 'bg-white/10 text-foreground-muted' };
            return (
              <Link key={order.id} href={`/supplier/orders`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                  <ShoppingCart size={12} className="text-foreground-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">#{order.id}</p>
                  <p className="text-[10px] text-foreground-muted">{order.customer}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-foreground-muted flex items-center gap-0.5"><Clock size={9} /> {order.time}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${st.cls}`}>{st.label}</span>
                  <p className="text-xs font-semibold text-foreground">₮{Math.round(order.total / 100).toLocaleString()}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
