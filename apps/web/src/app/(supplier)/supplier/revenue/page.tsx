'use client';

import { useMemo } from 'react';
import { TrendingUp, DollarSign, CreditCard, ArrowUpRight } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useSupplierStore } from '@/lib/supplier-store';

function getMockData() {
  const months = ['1 сар', '2 сар', '3 сар', '4 сар', '5 сар'];
  return months.map((month, i) => ({
    month,
    revenue: Math.floor(2000000 + Math.random() * 8000000),
    orders: Math.floor(40 + Math.random() * 120),
    payout: Math.floor(1800000 + Math.random() * 7000000),
  }));
}

const PAYOUT_HISTORY = [
  { id: 'PAY-001', amount: 4320000, date: '2025-05-20', status: 'SETTLED', bank: 'Хаан банк' },
  { id: 'PAY-002', amount: 6180000, date: '2025-04-20', status: 'SETTLED', bank: 'Хаан банк' },
  { id: 'PAY-003', amount: 5240000, date: '2025-03-20', status: 'SETTLED', bank: 'Хаан банк' },
  { id: 'PAY-004', amount: 3890000, date: '2025-02-20', status: 'SETTLED', bank: 'Хаан банк' },
];

type ToolTipPayload = { value: number };
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: ToolTipPayload[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-foreground-muted mb-1">{label}</p>
      <p className="font-bold text-foreground">₮{payload[0].value.toLocaleString('mn-MN')}</p>
    </div>
  );
};

export default function SupplierRevenuePage() {
  const { supplier } = useSupplierStore();
  const data = useMemo(() => getMockData(), []);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalPayout = data.reduce((s, d) => s + d.payout, 0);
  const totalCommission = totalRevenue - totalPayout;
  const commissionRate = supplier?.commissionRate ?? 10;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Орлого & Төлбөр</h2>
        <p className="text-sm text-foreground-muted mt-0.5">Комисс: {commissionRate}%</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, label: 'Нийт борлуулалт', value: `₮${(totalRevenue / 100).toLocaleString('mn-MN')}`, sub: '5 сарын нийт', color: 'bg-brand/15 text-brand' },
          { icon: DollarSign, label: 'Таны авах', value: `₮${(totalPayout / 100).toLocaleString('mn-MN')}`, sub: `${100 - commissionRate}% таны хувь`, color: 'bg-success/15 text-success' },
          { icon: CreditCard, label: 'Платформ комисс', value: `₮${(totalCommission / 100).toLocaleString('mn-MN')}`, sub: `${commissionRate}% комисс`, color: 'bg-foreground-muted/15 text-foreground-muted' },
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

      {/* Revenue chart */}
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
              <YAxis tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#FF4500" strokeWidth={2} fill="url(#revGrad)" dot={false} name="Борлуулалт" />
              <Area type="monotone" dataKey="payout" stroke="#10B981" strokeWidth={2} fill="url(#payGrad)" dot={false} name="Таны авах" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders bar chart */}
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

      {/* Payout history */}
      <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Төлбөрийн түүх</h3>
          <span className="text-xs text-foreground-muted">Сар бүрийн 20-нд</span>
        </div>
        <div className="space-y-2">
          {PAYOUT_HISTORY.map((pay) => (
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
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success">Гүйцэтгэгдсэн</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
