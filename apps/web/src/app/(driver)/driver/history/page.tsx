'use client';

import { useState } from 'react';
import { Star, MapPin, CheckCircle2, XCircle } from 'lucide-react';

const MOCK_HISTORY = [
  { id: 'DEL-H001', customer: 'Дорж Б.', dropoff: 'Баянзүрх, 10-р хороо', distance: 2.4, fee: 800000, rating: 5, date: '2025-05-26', status: 'COMPLETED', pickups: 2 },
  { id: 'DEL-H002', customer: 'Ганаа Н.', dropoff: 'Сүхбаатар, 8-р хороо', distance: 1.8, fee: 600000, rating: 5, date: '2025-05-26', status: 'COMPLETED', pickups: 1 },
  { id: 'DEL-H003', customer: 'Болд Э.', dropoff: 'Хан-Уул, 14-р хороо', distance: 3.1, fee: 1000000, rating: 4, date: '2025-05-25', status: 'COMPLETED', pickups: 2 },
  { id: 'DEL-H004', customer: 'Сарнай О.', dropoff: 'Баянгол, 3-р хороо', distance: 0.9, fee: 400000, rating: null, date: '2025-05-25', status: 'CANCELLED', pickups: 1 },
  { id: 'DEL-H005', customer: 'Энхжаргал Д.', dropoff: 'Чингэлтэй, 1-р хороо', distance: 2.0, fee: 700000, rating: 5, date: '2025-05-24', status: 'COMPLETED', pickups: 1 },
  { id: 'DEL-H006', customer: 'Мөнхбат С.', dropoff: 'Баянзүрх, 15-р хороо', distance: 2.8, fee: 900000, rating: 4, date: '2025-05-24', status: 'COMPLETED', pickups: 3 },
];

export default function DriverHistoryPage() {
  const [dateFilter, setDateFilter] = useState('all');

  const completed = MOCK_HISTORY.filter((h) => h.status === 'COMPLETED');
  const totalEarnings = completed.reduce((s, h) => s + h.fee, 0);
  const avgRating = completed.filter((h) => h.rating).reduce((s, h) => s + (h.rating ?? 0), 0) / completed.filter((h) => h.rating).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Хүргэлтийн түүх</h2>
        <p className="text-sm text-foreground-muted mt-0.5">{MOCK_HISTORY.length} нийт хүргэлт</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Нийт хүргэлт', value: String(completed.length), sub: `${MOCK_HISTORY.length - completed.length} цуцлагдсан` },
          { label: 'Нийт орлого', value: `₮${Math.round(totalEarnings / 100).toLocaleString()}`, sub: 'Бүх цаг' },
          { label: 'Дундаж үнэлгээ', value: avgRating.toFixed(1), sub: '⭐' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-card border border-[var(--glass-border)] rounded-2xl p-4 text-center">
            <p className="text-xl font-black text-brand font-mono">{value}</p>
            <p className="text-xs text-foreground-muted mt-1">{label}</p>
            <p className="text-[10px] text-foreground-muted">{sub}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {MOCK_HISTORY.map((item) => (
          <div key={item.id} className="bg-card border border-[var(--glass-border)] rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.status === 'COMPLETED' ? 'bg-success/15' : 'bg-error/15'}`}>
                  {item.status === 'COMPLETED' ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : (
                    <XCircle size={16} className="text-error" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">#{item.id}</p>
                  <p className="text-xs text-foreground-muted">{item.customer} · {item.date}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${item.status === 'COMPLETED' ? 'text-success' : 'text-foreground-muted'}`}>
                  {item.status === 'COMPLETED' ? `+₮${Math.round(item.fee / 100).toLocaleString()}` : 'Цуцлагдсан'}
                </p>
                <p className="text-xs text-foreground-muted">{item.distance} км</p>
              </div>
            </div>

            {item.status === 'COMPLETED' && (
              <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <MapPin size={11} /> <span className="truncate max-w-[180px]">{item.dropoff}</span>
                </div>
                {item.rating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} className={i < item.rating! ? 'text-amber fill-amber' : 'text-foreground-muted/30'} fill={i < item.rating! ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
