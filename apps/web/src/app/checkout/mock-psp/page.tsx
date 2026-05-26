'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';

const IS_DEV = process.env.NODE_ENV === 'development';

function MockPSPContent() {
  const router = useRouter();
  const params = useSearchParams();

  const sessionId = params.get('session') ?? 'MOCK-SESSION';
  const orderNo   = params.get('order')   ?? 'ORD-???';
  const amountStr = params.get('amount')  ?? '0';
  const amount    = parseInt(amountStr, 10);

  const [cardNo,  setCardNo]  = useState('');
  const [expiry,  setExpiry]  = useState('');
  const [cvv,     setCvv]     = useState('');
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  if (!IS_DEV) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <p className="text-foreground-muted">This page is only available in development mode.</p>
      </div>
    );
  }

  const formatCardNo = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawCard = cardNo.replace(/\s/g, '');
    if (rawCard.length < 16) { setError('Картын дугаар буруу байна'); return; }
    if (expiry.length < 5)   { setError('Хугацаа буруу байна'); return; }
    if (cvv.length < 3)      { setError('CVV буруу байна'); return; }
    if (!name.trim())        { setError('Эзэмшигчийн нэр оруулна уу'); return; }

    setLoading(true);
    // Simulate 2-second bank processing
    await new Promise((r) => setTimeout(r, 2000));
    router.push(`/checkout/success?order=${orderNo}`);
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Dev banner */}
        <div className="mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <span className="text-amber-400 text-sm">🛠</span>
          <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-wide">
            Mock PSP — Development Only
          </span>
        </div>

        <div className="bg-card border border-[var(--glass-border)] rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--glass-border)] bg-gradient-to-r from-brand/5 to-transparent">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">💳</span>
              <span className="font-bold text-foreground">Картаар төлөх</span>
            </div>
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span className="font-mono">{orderNo}</span>
              <span className="font-semibold text-foreground">
                ₮{amount.toLocaleString('mn-MN')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Card preview strip */}
            <div className="h-12 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 border border-[var(--glass-border)] flex items-center justify-between px-4">
              <div className="flex gap-1">
                {[0,1,2,3].map((g) => (
                  <span key={g} className="font-mono text-xs text-foreground/60 tracking-widest">
                    {cardNo.replace(/\s/g, '').slice(g*4, g*4+4).padEnd(4, '·')}
                  </span>
                ))}
              </div>
              <span className="text-foreground-muted text-xs">VISA</span>
            </div>

            {/* Card number */}
            <div>
              <label className="block text-xs text-foreground-muted mb-1.5">Картын дугаар</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNo}
                onChange={(e) => setCardNo(formatCardNo(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-foreground placeholder:text-foreground-muted/50 font-mono text-sm focus:outline-none focus:border-brand/50"
              />
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-foreground-muted mb-1.5">Дуусах огноо</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-foreground placeholder:text-foreground-muted/50 font-mono text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1.5">CVV</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  maxLength={4}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-foreground placeholder:text-foreground-muted/50 font-mono text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
            </div>

            {/* Cardholder name */}
            <div>
              <label className="block text-xs text-foreground-muted mb-1.5">Эзэмшигчийн нэр</label>
              <input
                type="text"
                placeholder="BOLD BOLD"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-foreground placeholder:text-foreground-muted/50 font-mono text-sm focus:outline-none focus:border-brand/50"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-error text-xs px-1">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Боловсруулж байна...
                </>
              ) : (
                `Төлбөр баталгаажуулах — ₮${amount.toLocaleString('mn-MN')}`
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="w-full py-2 text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              ← Буцах
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-foreground-muted/40 mt-3 font-mono">
          session: {sessionId.slice(0, 24)}...
        </p>
      </m.div>
    </div>
  );
}

export default function MockPSPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    }>
      <MockPSPContent />
    </Suspense>
  );
}
