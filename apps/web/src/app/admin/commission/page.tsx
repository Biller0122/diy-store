'use client';

import { useState } from 'react';
import { Save, Percent, TrendingUp, Store } from 'lucide-react';

interface CommissionTier {
  id: string;
  name: string;
  minRevenue: number;
  maxRevenue: number | null;
  rate: number;
  supplierCount: number;
}

const DEFAULT_TIERS: CommissionTier[] = [
  { id: 't1', name: 'Эхлэл',     minRevenue: 0,         maxRevenue: 5_000_000,  rate: 15, supplierCount: 12 },
  { id: 't2', name: 'Стандарт',  minRevenue: 5_000_000, maxRevenue: 20_000_000, rate: 12, supplierCount: 8 },
  { id: 't3', name: 'Нэмэгдсэн', minRevenue: 20_000_000, maxRevenue: null,      rate: 10, supplierCount: 3 },
];

const SPECIAL_RATES: { supplierId: string; supplierName: string; rate: number; reason: string }[] = [
  { supplierId: 's1', supplierName: 'Ганцоо барилгын материал', rate: 8, reason: 'Үндсэн хамтрагч' },
  { supplierId: 's2', supplierName: 'Төмөр зах',                rate: 9, reason: 'Эрт бүртгэлтэн' },
];

function fmt(n: number) {
  return `₮${Math.round(n / 100).toLocaleString('mn-MN')}`;
}

const COMMISSION_STORAGE_KEY = 'diy-admin-commission-tiers';

function loadTiers() {
  if (typeof window === 'undefined') return DEFAULT_TIERS;
  try {
    const saved = window.localStorage.getItem(COMMISSION_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CommissionTier[]) : DEFAULT_TIERS;
  } catch {
    return DEFAULT_TIERS;
  }
}

export default function AdminCommissionPage() {
  const [tiers, setTiers] = useState<CommissionTier[]>(DEFAULT_TIERS);
  const [saved, setSaved] = useState(false);

  // Load persisted tiers on mount
  useState(() => {
    setTiers(loadTiers());
  });

  function updateRate(id: string, rate: number) {
    setTiers((prev) => prev.map((t) => t.id === id ? { ...t, rate: Math.max(0, Math.min(50, rate)) } : t));
  }

  function save() {
    try {
      window.localStorage.setItem(COMMISSION_STORAGE_KEY, JSON.stringify(tiers));
    } catch {
      // storage unavailable
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const totalRevenue = 125_000_000_00; // mock
  const totalCommission = totalRevenue * 0.12;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Комиссийн тохиргоо</h1>
          <p className="text-sm text-foreground-muted mt-0.5">Нийлүүлэгчдийн борлуулалтаас авах хувиас тохируулна уу.</p>
        </div>
        <button
          onClick={save}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${saved ? 'bg-success text-white' : 'bg-brand text-white hover:bg-brand-hover'}`}
        >
          <Save size={14} /> {saved ? 'Хадгалагдлаа ✓' : 'Хадгалах'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, label: 'Энэ сарын нийт орлого', value: fmt(totalRevenue), color: 'text-brand' },
          { icon: Percent,    label: 'Нийт комисс',           value: fmt(totalCommission), color: 'text-success' },
          { icon: Store,      label: 'Нийт нийлүүлэгч',       value: `${DEFAULT_TIERS.reduce((s, t) => s + t.supplierCount, 0)}`, color: 'text-foreground' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card rounded-2xl border border-[var(--glass-border)] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-brand" />
            </div>
            <div>
              <p className="text-xs text-foreground-muted">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Commission tiers */}
      <div className="bg-card rounded-2xl border border-[var(--glass-border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--glass-border)]">
          <h2 className="text-sm font-bold text-foreground">Комиссийн түвшин</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Борлуулалтын хэмжээгээр тодорхойлно.</p>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          {tiers.map((tier) => (
            <div key={tier.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{tier.name}</p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {fmt(tier.minRevenue)} — {tier.maxRevenue ? fmt(tier.maxRevenue) : 'Хязгааргүй'}
                  {' · '}{tier.supplierCount} нийлүүлэгч
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0} max={50} step={0.5}
                  value={tier.rate}
                  onChange={(e) => updateRate(tier.id, parseFloat(e.target.value))}
                  className="w-20 rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-center font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <span className="text-sm text-foreground-muted">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special rates */}
      <div className="bg-card rounded-2xl border border-[var(--glass-border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--glass-border)]">
          <h2 className="text-sm font-bold text-foreground">Тусгай комисс</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Тодорхой нийлүүлэгчдэд тусгай хувь.</p>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          {SPECIAL_RATES.map((s) => (
            <div key={s.supplierId} className="px-5 py-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{s.supplierName}</p>
                <p className="text-xs text-foreground-muted">{s.reason}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-success/10 text-success text-sm font-bold border border-success/20">
                  {s.rate}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-[var(--glass-border)]">
          <button className="text-xs text-brand hover:underline">+ Тусгай комисс нэмэх</button>
        </div>
      </div>
    </div>
  );
}
