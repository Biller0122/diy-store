'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Star, Wallet, Navigation } from 'lucide-react';
import { useDriverStore } from '@/lib/driver-store';

type Period = 'today' | 'week' | 'month';

const HISTORY = [
  { id: 'D-1092', date: 'Өнөөдөр 12:40', pickup: 'Баянзүрх', dropoff: 'Чингэлтэй', fee: 850000, rating: 5, status: 'DONE' },
  { id: 'D-1091', date: 'Өнөөдөр 11:15', pickup: 'Сүхбаатар', dropoff: 'Баянзүрх', fee: 650000, rating: 5, status: 'DONE' },
  { id: 'D-1090', date: 'Өнөөдөр 09:50', pickup: 'Хан-Уул', dropoff: 'Баянгол', fee: 920000, rating: 4.8, status: 'DONE' },
  { id: 'D-1089', date: 'Өчигдөр 18:10', pickup: 'Сонгинохайрхан', dropoff: 'Сүхбаатар', fee: 700000, rating: 5, status: 'DONE' },
  { id: 'D-1088', date: 'Өчигдөр 15:35', pickup: 'Чингэлтэй', dropoff: 'Хан-Уул', fee: 0, rating: 0, status: 'CANCELLED' },
];

function makeData(period: Period) {
  if (period === 'today') {
    return ['09', '10', '11', '12', '13', '14', '15'].map((label, index) => ({
      label: `${label}:00`,
      earnings: [350000, 0, 650000, 850000, 0, 450000, 0][index],
    }));
  }
  const labels = period === 'week' ? ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'] : ['1', '5', '10', '15', '20', '25', '30'];
  return labels.map((label, index) => ({
    label,
    earnings: [2400000, 3100000, 1800000, 4200000, 3600000, 5100000, 2850000][index],
  }));
}

export default function DriverEarningsPage() {
  const { driver } = useDriverStore();
  const [period, setPeriod] = useState<Period>('today');
  const data = useMemo(() => makeData(period), [period]);
  const totalEarnings = data.reduce((sum, item) => sum + item.earnings, 0);
  const totalDeliveries = period === 'today' ? 7 : period === 'week' ? 42 : 164;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground">Орлого</h2>
          <p className="text-sm text-foreground-muted">Хүргэлтийн орлого болон шилжүүлгийн мэдээлэл</p>
        </div>
        <div className="flex rounded-2xl border border-white/10 bg-card p-1">
          {[
            ['today', 'Өнөөдөр'],
            ['week', 'Энэ 7 хоног'],
            ['month', 'Энэ сар'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key as Period)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                period === key ? 'bg-brand text-white' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-3 gap-3">
        {[
          { icon: Navigation, label: 'Нийт хүргэлт', value: String(totalDeliveries) },
          { icon: Wallet, label: 'Нийт орлого', value: `₮${Math.round(totalEarnings / 100).toLocaleString()}` },
          { icon: Star, label: 'Дундаж үнэлгээ', value: `★ ${driver?.rating ?? '5.0'}` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
            <Icon className="mb-3 text-brand" size={18} />
            <p className="text-xs text-foreground-muted">{label}</p>
            <p className="mt-1 text-lg font-black text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
        <h3 className="mb-4 font-bold text-foreground">Орлогын график</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value) / 100000}K`} width={42} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: '#121416', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14 }}
                formatter={(value) => [`₮${Math.round(Number(value) / 100).toLocaleString()}`, 'Орлого']}
              />
              <Bar dataKey="earnings" fill="#ff4500" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
        <h3 className="mb-4 font-bold text-foreground">Хүргэлтийн түүх</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-xs text-foreground-muted">
              <tr className="border-b border-white/10">
                <th className="py-3">Огноо</th>
                <th>Авах бүс</th>
                <th>Хүргэх бүс</th>
                <th>Орлого</th>
                <th>Үнэлгээ</th>
                <th>Төлөв</th>
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-3 text-foreground">{row.date}</td>
                  <td className="text-foreground-muted">{row.pickup}</td>
                  <td className="text-foreground-muted">{row.dropoff}</td>
                  <td className="font-bold text-success">₮{Math.round(row.fee / 100).toLocaleString()}</td>
                  <td className="text-foreground">{row.rating ? `★ ${row.rating}` : '-'}</td>
                  <td>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                      row.status === 'DONE' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
                    }`}>
                      {row.status === 'DONE' ? 'Дууссан' : 'Цуцлагдсан'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-foreground">Банкны данс</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              {driver?.bankName ? `${driver.bankName} · ${driver.bankAccount}` : 'Дансны мэдээлэл хүлээгдэж байна'}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-foreground-muted hover:text-foreground">Засах</button>
            <button disabled className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-foreground-muted opacity-60">
              Төлбөр шилжүүлэх хүсэлт
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
