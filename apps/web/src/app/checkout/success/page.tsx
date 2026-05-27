'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import Link from 'next/link';
import { trackPurchase } from '@/lib/analytics/ga4';

function SuccessContent() {
  const params   = useSearchParams();
  const router   = useRouter();
  const orderNo  = params.get('order') ?? 'ORD-UNKNOWN';
  const orderId  = params.get('id') ?? orderNo;
  const firedRef = useRef(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    trackPurchase({ id: orderNo, total: 0, items: [] });

    import('canvas-confetti').then(({ default: confetti }) => {
      const end = Date.now() + 3000;
      const colors = ['#FF4500', '#FF6B35', '#FFD700', '#00C851', '#33B5E5'];
      const frame = () => {
        confetti({ particleCount: 3, angle: 60,  spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    });
  }, []);

  // Auto-redirect countdown to tracking page
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown((v) => {
        if (v <= 1) {
          window.clearInterval(interval);
          router.push(`/track/${orderId}`);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [orderId, router]);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        {/* Animated checkmark */}
        <m.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 0.1 }}
          className="w-28 h-28 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center mx-auto mb-6"
        >
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 8, stiffness: 200, delay: 0.3 }}
            className="text-5xl"
          >
            ✅
          </m.span>
        </m.div>

        {/* Heading */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-2xl font-extrabold text-foreground mb-2">
            Захиалга амжилттай!
          </h1>
          <p className="text-foreground-muted text-sm mb-1">
            Таны захиалга баталгаажлаа.
          </p>
          <p className="text-foreground-muted text-sm">
            Захиалгын дугаар:{' '}
            <span className="font-mono font-bold text-foreground bg-surface px-2 py-0.5 rounded-lg border border-[var(--glass-border)]">
              {orderNo}
            </span>
          </p>
        </m.div>

        {/* Status card */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-6 bg-card border border-[var(--glass-border)] rounded-2xl p-5 text-left space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 border border-success/20 flex items-center justify-center shrink-0">
              <span className="text-success text-sm">📦</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Бараа бэлдэж байна</p>
              <p className="text-xs text-foreground-muted">Захиалга баталгаажсан</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 animate-pulse">
              <span className="text-sm">🔍</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground animate-pulse">Жолооч хайж байна...</p>
              <p className="text-xs text-foreground-muted">Ойр орчмоос жолооч олж байна</p>
            </div>
          </div>
          <div className="flex items-center gap-3 opacity-50">
            <div className="w-8 h-8 rounded-full bg-surface border border-[var(--glass-border)] flex items-center justify-center shrink-0">
              <span className="text-sm">🚚</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Хүргэлтэнд гарна</p>
              <p className="text-xs text-foreground-muted">Удахгүй...</p>
            </div>
          </div>
          <div className="flex items-center gap-3 opacity-50">
            <div className="w-8 h-8 rounded-full bg-surface border border-[var(--glass-border)] flex items-center justify-center shrink-0">
              <span className="text-sm">🏠</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Хүргэгдсэн</p>
              <p className="text-xs text-foreground-muted">Удахгүй...</p>
            </div>
          </div>
        </m.div>

        {/* Actions */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-5 space-y-3"
        >
          <Link
            href={`/track/${orderId}`}
            className="block w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover transition-colors text-center"
          >
            Захиалга хянах → {countdown > 0 && `(${countdown}с)`}
          </Link>
          <Link
            href="/account/orders"
            className="block w-full py-3 rounded-xl bg-surface border border-[var(--glass-border)] text-foreground font-semibold text-sm hover:bg-card transition-colors text-center"
          >
            Миний захиалгууд
          </Link>
          <Link
            href="/"
            className="block w-full py-3 rounded-xl bg-surface border border-[var(--glass-border)] text-foreground-muted font-semibold text-sm hover:bg-card transition-colors text-center"
          >
            Дэлгүүр рүү буцах
          </Link>
        </m.div>

        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-4 text-xs text-foreground-muted/60"
        >
          Захиалгын баримт таны и-мэйл рүү илгээгдсэн.
        </m.p>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
