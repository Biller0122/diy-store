'use client';

import { useMemo, useState } from 'react';
import { ThumbsUp, Star } from 'lucide-react';
import { MOCK_REVIEWS } from '@/lib/admin-data';
import { useAuthStore } from '@/lib/auth-store';
import WriteReviewModal from './WriteReviewModal';

type SortMode = 'latest' | 'highest' | 'helpful';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={15} fill={index < rating ? 'currentColor' : 'none'} className={index < rating ? 'text-amber' : 'text-foreground-muted/30'} />
      ))}
    </div>
  );
}

function displayName(name: string) {
  const [first, last] = name.split(' ');
  return `${first ?? 'Хэрэглэгч'} ${last?.[0] ?? ''}.`;
}

export default function ReviewSection({ productId }: { productId: string }) {
  const [sort, setSort] = useState<SortMode>('latest');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const customer = useAuthStore((state) => state.customer);
  const verifiedPurchase = Boolean(customer);

  const approved = useMemo(() => {
    const base = MOCK_REVIEWS.filter((review) => review.status === 'APPROVED' || review.productId === productId);
    return [...base].sort((a, b) => {
      if (sort === 'highest') return b.rating - a.rating;
      if (sort === 'helpful') return b.helpfulCount - a.helpfulCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [productId, sort]);

  const average = approved.length ? approved.reduce((sum, item) => sum + item.rating, 0) / approved.length : 0;
  const breakdown = [5, 4, 3, 2, 1].map((rating) => {
    const count = approved.filter((item) => item.rating === rating).length;
    return { rating, count, percent: approved.length ? Math.round((count / approved.length) * 100) : 0 };
  });
  const visible = approved.slice(0, page * 10);

  return (
    <section className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-[var(--glass-border)] bg-dark p-5">
          <p className="text-4xl font-extrabold text-foreground">{average.toFixed(1)}</p>
          <Stars rating={Math.round(average)} />
          <p className="mt-2 text-xs text-foreground-muted">Нийт {approved.length} сэтгэгдэл</p>
          {verifiedPurchase && (
            <button onClick={() => setModalOpen(true)} className="mt-4 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-hover">
              Сэтгэгдэл үлдээх
            </button>
          )}
        </div>

        <div className="space-y-2 rounded-2xl border border-[var(--glass-border)] bg-dark p-5">
          {breakdown.map((row) => (
            <div key={row.rating} className="grid grid-cols-[32px_1fr_42px] items-center gap-3 text-xs">
              <span className="text-foreground">{row.rating}★</span>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-amber" style={{ width: `${row.percent}%` }} />
              </div>
              <span className="text-right text-foreground-muted">{row.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Хэрэглэгчдийн сэтгэгдэл</p>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="rounded-xl border border-[var(--glass-border)] bg-dark px-3 py-2 text-xs text-foreground-muted outline-none">
          <option value="latest">Хамгийн сүүлд</option>
          <option value="highest">Хамгийн их үнэлгээ</option>
          <option value="helpful">Хамгийн тус болсон</option>
        </select>
      </div>

      <div className="space-y-3">
        {visible.map((review) => (
          <article key={review.id} className="rounded-2xl border border-[var(--glass-border)] bg-dark p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{displayName(review.customerName)}</p>
              <Stars rating={review.rating} />
              {review.verifiedPurchase && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">Баталгаажсан худалдан авалт</span>}
              <span className="ml-auto text-[10px] text-foreground-muted">{new Date(review.createdAt).toLocaleDateString('mn-MN')}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-foreground">{review.title}</p>
            <p className="mt-1 text-sm leading-6 text-foreground-muted">{review.body}</p>
            <button className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground">
              Тус болсон? <ThumbsUp size={13} /> ({review.helpfulCount})
            </button>
          </article>
        ))}
      </div>

      {visible.length < approved.length && (
        <button onClick={() => setPage((value) => value + 1)} className="w-full rounded-xl border border-[var(--glass-border)] bg-dark py-3 text-sm font-semibold text-foreground-muted hover:text-foreground">
          Дахин 10 сэтгэгдэл ачаалах
        </button>
      )}

      <WriteReviewModal open={modalOpen} onClose={() => setModalOpen(false)} productId={productId} verifiedPurchase={verifiedPurchase} />
    </section>
  );
}
