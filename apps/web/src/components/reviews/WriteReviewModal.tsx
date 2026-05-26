'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import { CheckCircle, Star, X } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

export default function WriteReviewModal({
  open,
  onClose,
  verifiedPurchase = false,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  verifiedPurchase?: boolean;
}) {
  const router = useRouter();
  const customer = useAuthStore((state) => state.customer);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (!customer) {
      router.push('/account/login');
      return;
    }
    if (body.trim().length < 20) return;
    setSubmitted(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <m.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--glass-border)] bg-card p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Сэтгэгдэл үлдээх</h3>
                <p className="text-xs text-foreground-muted">Таны сэтгэгдэл админаар шалгагдсаны дараа нийтлэгдэнэ.</p>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-foreground-muted hover:bg-white/5 hover:text-foreground"><X size={16} /></button>
            </div>

            {submitted ? (
              <div className="py-10 text-center">
                <CheckCircle className="mx-auto mb-3 text-emerald-400" size={36} />
                <p className="text-sm font-semibold text-foreground">Сэтгэгдэл шалгагдаж байна</p>
                <p className="mt-1 text-xs text-foreground-muted">Баярлалаа. Батлагдмагц бүтээгдэхүүний хуудсанд харагдана.</p>
                <button onClick={onClose} className="mt-5 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white">Хаах</button>
              </div>
            ) : (
              <div className="space-y-4">
                {verifiedPurchase && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                    Баталгаажсан худалдан авалтын badge харагдана.
                  </div>
                )}

                <div>
                  <span className="mb-2 block text-xs text-foreground-muted">Үнэлгээ</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <button key={index} onClick={() => setRating(index + 1)} className="transition hover:scale-110">
                        <Star size={30} fill={index < rating ? 'currentColor' : 'none'} className={index < rating ? 'text-amber' : 'text-foreground-muted/30'} />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs text-foreground-muted">Гарчиг</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50" />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs text-foreground-muted">Сэтгэгдэл</span>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full resize-none rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50" />
                  <span className={`text-[10px] ${body.length < 20 ? 'text-error' : 'text-foreground-muted'}`}>Доод тал нь 20 тэмдэгт</span>
                </label>

                <button onClick={submit} disabled={body.trim().length < 20} className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:bg-surface disabled:text-foreground-muted">
                  Илгээх
                </button>
              </div>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
