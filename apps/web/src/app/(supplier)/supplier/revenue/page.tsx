'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, DollarSign, CreditCard, ArrowUpRight } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useSupplierStore } from '@/lib/supplier-store';
import { vendureShopFetch } from '@/lib/vendure';

type RevenueOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  orderItems: { supplierId: string; name: string; qty: number; price: number }[];
};

type ChartRow = {
  month: string;
  revenue: number;
  orders: number;
  payout: number;
};

const REVENUE_QUERY = `
  query SupplierRevenue($supplierId: String!) {
    supplierDeliveryRequests(supplierId: $supplierId) {
      id
      orderNumber
      status
      createdAt
      orderItems {
        supplierId
        name
        qty
        price
      }
    }
  }
`;

type ToolTipPayload = { value: number };
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: ToolTipPayload[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-foreground-muted mb-1">{label}</p>
      <p className="font-bold text-foreground">₮{Math.round(payload[0].value / 100).toLocaleString('mn-MN')}</p>
    </div>
  );
};

function monthLabel(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function SupplierRevenuePage() {
  const { supplier } = useSupplierStore();
  const supplierId = supplier?.id;
  const commissionRate = supplier?.commissionRate ?? 10;
  const [orders, setOrders] = useState<RevenueOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supplierId) return;
    let mounted = true;
    async function loadRevenue() {
      setLoading(true);
      try {
        const data = await vendureShopFetch<{ supplierDeliveryRequests: RevenueOrder[] }>(
          REVENUE_QUERY,
          { supplierId },
        );
        if (!mounted) return;
        setOrders(data.supplierDeliveryRequests);
        setError('');
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Орлого татахад алдаа гарлаа');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadRevenue();
    return () => {
      mounted = false;
    };
  }, [supplierId]);

  const data = useMemo<ChartRow[]>(() => {
    const grouped = new Map<string, ChartRow>();
    for (const order of orders) {
      const date = new Date(order.createdAt);
      const key = monthLabel(Number.isNaN(date.getTime()) ? new Date() : date);
      const current = grouped.get(key) ?? { month: key, revenue: 0, payout: 0, orders: 0 };
      const supplierTotal = order.orderItems
        .filter((item) => String(item.supplierId) === String(supplierId))
        .reduce((sum, item) => sum + item.price * item.qty, 0);
      current.revenue += supplierTotal;
      current.payout += Math.round(supplierTotal * (100 - commissionRate) / 100);
      current.orders += supplierTotal > 0 ? 1 : 0;
      grouped.set(key, current);
    }
    return Array.from(grouped.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [commissionRate, orders, supplierId]);

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalPayout = data.reduce((s, d) => s + d.payout, 0);
  const totalCommission = totalRevenue - totalPayout;
  const payoutHistory = data
    .slice()
    .reverse()
    .filter((row) => row.payout > 0)
    .map((row, index) => ({
      id: `PAY-${row.month}-${index + 1}`,
      amount: row.payout,
      date: `${row.month}-20`,
      bank: 'Банк тохируулаагүй',
    }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Орлого & Төлбөр</h2>
        <p className="text-sm text-foreground-muted mt-0.5">{loading ? 'Синк хийж байна...' : `Комисс: ${commissionRate}%`}</p>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, label: 'Нийт борлуулалт', value: `₮${Math.round(totalRevenue / 100).toLocaleString('mn-MN')}`, sub: 'DB захиалгын нийт', color: 'bg-brand/15 text-brand' },
          { icon: DollarSign, label: 'Таны авах', value: `₮${Math.round(totalPayout / 100).toLocaleString('mn-MN')}`, sub: `${100 - commissionRate}% таны хувь`, color: 'bg-success/15 text-success' },
          { icon: CreditCard, label: 'Платформ комисс', value: `₮${Math.round(totalCommission / 100).toLocaleString('mn-MN')}`, sub: `${commissionRate}% комисс`, color: 'bg-foreground-muted/15 text-foreground-muted' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-card border border-[var(--glass-border)] rounded-2xl p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={16} />
            </div>
            <p className="text-xs text-foreground-muted mb-1">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-[11px] text-foreground-muted mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Сарын орлого</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4500" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#FF4500" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000000)}M`} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#FF4500" strokeWidth={2} fill="url(#revGrad)" dot={false} name="Борлуулалт" />
              <Area type="monotone" dataKey="payout" stroke="#10B981" strokeWidth={2} fill="url(#payGrad)" dot={false} name="Таны авах" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Сарын захиалга</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--glass-border)', borderRadius: 12, fontSize: 11 }} />
              <Bar dataKey="orders" fill="#FF4500" radius={[4, 4, 0, 0]} name="Захиалга" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Төлбөрийн түүх</h3>
          <span className="text-xs text-foreground-muted">Real захиалгын тооцоо</span>
        </div>
        <div className="space-y-2">
          {payoutHistory.map((pay) => (
            <div key={pay.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                <ArrowUpRight size={14} className="text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">#{pay.id}</p>
                <p className="text-[10px] text-foreground-muted">{pay.date} · {pay.bank}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-success">+₮{Math.round(pay.amount / 100).toLocaleString()}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success">Тооцоолсон</span>
              </div>
            </div>
          ))}
          {payoutHistory.length === 0 && (
            <p className="py-8 text-center text-sm text-foreground-muted">Одоогоор орлогын өгөгдөл алга</p>
          )}
        </div>
      </div>
    </div>
  );
}
