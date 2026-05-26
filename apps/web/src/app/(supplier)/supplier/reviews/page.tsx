'use client';

import { useState } from 'react';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';

const MOCK_REVIEWS = [
  { id: 'r1', customerName: 'Дорж Б.', rating: 5, comment: 'Маш сайн бараа, хурдан хүргэлт. Өнгө нь сайхан, зүлгэмж нь ч тааруу биш. Дахин авна.', product: 'Dulux EasyCare 4L', date: '2025-05-24', helpful: 12 },
  { id: 'r2', customerName: 'Ганаа Н.', rating: 4, comment: 'Дундаж чанартай. Үнэ нь боломжийн.', product: 'Caparol Indeko 10L', date: '2025-05-22', helpful: 5 },
  { id: 'r3', customerName: 'Болд Э.', rating: 5, comment: 'Гайхалтай бараа! Маш их санал болгож байна.', product: 'Knauf Праймер 25кг', date: '2025-05-20', helpful: 8 },
  { id: 'r4', customerName: 'Сарнай О.', rating: 3, comment: 'Бараа нь сайн ч хүргэлт удаан байсан.', product: 'Marshall Будаг 2.5L', date: '2025-05-18', helpful: 3 },
  { id: 'r5', customerName: 'Энхжаргал Д.', rating: 4, comment: 'Сайн бараа. Дараа дахин захиалах болно.', product: 'Dulux EasyCare 4L', date: '2025-05-15', helpful: 7 },
];

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={12} className={i < rating ? 'text-amber fill-amber' : 'text-foreground-muted/30'} fill={i < rating ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

export default function SupplierReviewsPage() {
  const [filter, setFilter] = useState<number | 'all'>('all');

  const filtered = MOCK_REVIEWS.filter((r) => filter === 'all' || r.rating === filter);
  const avgRating = MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length;

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: MOCK_REVIEWS.filter((r) => r.rating === star).length,
    pct: (MOCK_REVIEWS.filter((r) => r.rating === star).length / MOCK_REVIEWS.length) * 100,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Сэтгэгдэл</h2>
        <p className="text-sm text-foreground-muted mt-0.5">{MOCK_REVIEWS.length} нийт сэтгэгдэл</p>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Average */}
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5 flex items-center gap-5">
          <div className="text-center">
            <p className="text-5xl font-black text-brand font-mono">{avgRating.toFixed(1)}</p>
            <StarRating rating={Math.round(avgRating)} />
            <p className="text-xs text-foreground-muted mt-1">{MOCK_REVIEWS.length} сэтгэгдэл</p>
          </div>
          <div className="flex-1 space-y-2">
            {ratingCounts.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-foreground-muted w-3">{star}</span>
                <Star size={10} className="text-amber fill-amber shrink-0" fill="currentColor" />
                <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full bg-amber" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-foreground-muted w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Тойм</h3>
          <div className="space-y-3">
            {[
              { label: '5 одтой', value: '60%', color: 'text-success' },
              { label: 'Баталгаат худалдааны', value: '100%', color: 'text-foreground' },
              { label: 'Хариу өгсөн', value: '80%', color: 'text-brand' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-foreground-muted">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 5, 4, 3, 2, 1] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-brand text-white' : 'bg-card border border-[var(--glass-border)] text-foreground-muted hover:text-foreground'}`}
          >
            {f === 'all' ? 'Бүгд' : `${f} ★`}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {filtered.map((review) => (
          <div key={review.id} className="bg-card border border-[var(--glass-border)] rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand">{review.customerName[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{review.customerName}</p>
                  <p className="text-[10px] text-foreground-muted">{review.product} · {review.date}</p>
                </div>
              </div>
              <StarRating rating={review.rating} />
            </div>

            <p className="text-sm text-foreground-muted leading-relaxed mb-3">{review.comment}</p>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors">
                <ThumbsUp size={12} /> Тустай ({review.helpful})
              </button>
              <button className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-light transition-colors">
                <MessageSquare size={12} /> Хариулах
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
