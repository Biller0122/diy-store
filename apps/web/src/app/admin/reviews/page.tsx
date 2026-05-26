'use client';

import { useMemo, useState } from 'react';
import { Check, Package, Star, Trash2, X } from 'lucide-react';
import { MOCK_REVIEWS, type AdminReview } from '@/lib/admin-data';

const FILTERS = [
  { key: '', label: 'Бүгд' },
  { key: 'PENDING', label: 'Хүлээгдэж буй' },
  { key: 'APPROVED', label: 'Батлагдсан' },
  { key: 'REJECTED', label: 'Татгалзсан' },
];

const STATUS_LABEL: Record<AdminReview['status'], string> = {
  PENDING: 'Хүлээгдэж буй',
  APPROVED: 'Батлагдсан',
  REJECTED: 'Татгалзсан',
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-amber">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={14} fill={index < rating ? 'currentColor' : 'none'} className={index < rating ? '' : 'text-foreground-muted/30'} />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const reviews = useMemo(
    () => MOCK_REVIEWS.filter((review) => !filter || review.status === filter),
    [filter],
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === item.key ? 'bg-brand text-white' : 'border border-[var(--glass-border)] bg-card text-foreground-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-400">
            <Check size={13} /> Бөөнөөр батлах
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-error/10 px-3 py-2 text-xs font-semibold text-error">
            <X size={13} /> Бөөнөөр татгалзах
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <input type="checkbox" checked={selected.has(review.id)} onChange={() => toggle(review.id)} className="mt-2 h-4 w-4 accent-brand" />
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface">
                  <Package size={18} className="text-foreground-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{review.productName}</p>
                    <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[10px] text-foreground-muted">{STATUS_LABEL[review.status]}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Stars rating={review.rating} />
                    <span className="text-xs text-foreground-muted">{review.customerName}</span>
                    {review.verifiedPurchase && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">Баталгаажсан худалдан авалт</span>}
                    <span className="text-[10px] text-foreground-muted">{new Date(review.createdAt).toLocaleDateString('mn-MN')}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{review.title}</p>
                  <p className="mt-1 text-sm leading-6 text-foreground-muted">{review.body}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 md:flex-col">
                <button className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25">
                  <Check size={13} /> Батлах
                </button>
                <button className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-error/10 px-3 py-2 text-xs font-semibold text-error hover:bg-error/20">
                  <X size={13} /> Татгалзах
                </button>
                <button className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-foreground-muted hover:text-error">
                  <Trash2 size={13} /> Устгах
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
