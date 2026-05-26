'use client';

import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

// ─── Bank deep links (UI only — real links added when PSP is live) ───

const BANKS = [
  { name: 'Хаан Банк',            short: 'Khan',      emoji: '🏦', color: 'bg-blue-600/10  border-blue-600/20  text-blue-400' },
  { name: 'Голомт Банк',           short: 'Golomt',    emoji: '🏛️', color: 'bg-green-600/10 border-green-600/20 text-green-400' },
  { name: 'Худалдаа Хөгжлийн',    short: 'TDB',       emoji: '💼', color: 'bg-red-600/10   border-red-600/20   text-red-400' },
  { name: 'Төрийн Банк',           short: 'State',     emoji: '🏢', color: 'bg-sky-600/10   border-sky-600/20   text-sky-400' },
  { name: 'Хас Банк',              short: 'Xac',       emoji: '🔵', color: 'bg-indigo-600/10 border-indigo-600/20 text-indigo-400' },
  { name: 'Капитрон Банк',         short: 'Capitron',  emoji: '🟠', color: 'bg-orange-600/10 border-orange-600/20 text-orange-400' },
  { name: 'М Банк',                short: 'M Bank',    emoji: '📱', color: 'bg-purple-600/10 border-purple-600/20 text-purple-400' },
  { name: 'Богд Банк',             short: 'Bogd',      emoji: '🏔️', color: 'bg-teal-600/10  border-teal-600/20  text-teal-400' },
  { name: 'Ард Апп',               short: 'Ard',       emoji: '🔴', color: 'bg-rose-600/10  border-rose-600/20  text-rose-400' },
  { name: 'МостМани',              short: 'Most',      emoji: '💰', color: 'bg-amber/10     border-amber/20     text-amber' },
];

const IS_DEV = process.env.NODE_ENV === 'development';
const COUNTDOWN_SECS = 600; // 10 minutes

interface QPayModalProps {
  orderNo: string;
  total:   number;
  onSuccess: () => void;
  onClose:   () => void;
}

type ModalState = 'waiting' | 'success' | 'expired';

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Fake QR content — replaced by real QPay invoice URL in production
const MOCK_QR_URL = (orderNo: string, total: number) =>
  `https://mock.qpay.mn/q?order=${orderNo}&amount=${Math.round(total / 100)}`;

export function QPayModal({ orderNo, total, onSuccess, onClose }: QPayModalProps) {
  const [state, setState] = useState<ModalState>('waiting');
  const [secs, setSecs] = useState(COUNTDOWN_SECS);
  const [simulating, setSimulating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const qrValue = MOCK_QR_URL(orderNo, total);
  const fmt = (minor: number) => `₮${Math.round(minor / 100).toLocaleString('mn-MN')}`;

  // ── Countdown ──
  useEffect(() => {
    countRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(countRef.current!);
          setState('expired');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { clearInterval(countRef.current!); };
  }, []);

  // ── Mock auto-pay (dev only, 5 second delay after simulate button) ──
  const handleSimulate = async () => {
    setSimulating(true);
    // Simulate 5-second "bank processing" delay
    await new Promise((r) => setTimeout(r, 5000));
    handleSuccess();
  };

  const handleSuccess = () => {
    clearInterval(pollRef.current!);
    clearInterval(countRef.current!);
    setState('success');
    setTimeout(onSuccess, 1800); // let success animation play
  };

  // ── Poll mock endpoint (ready to swap for real API) ──
  useEffect(() => {
    if (IS_DEV) return; // Dev uses the simulate button instead
    // TODO: Replace with real QPay polling when backend is live
    // pollRef.current = setInterval(async () => {
    //   const res = await fetch(`/api/payment/qpay/check?invoiceId=...`);
    //   const { paid } = await res.json();
    //   if (paid) handleSuccess();
    // }, 3000);
    return () => { clearInterval(pollRef.current!); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-md bg-card border border-[var(--glass-border)] rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)] bg-gradient-to-r from-brand/5 to-transparent">
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <span className="font-bold text-foreground">QPay</span>
            <span className="text-xs bg-card border border-[var(--glass-border)] px-2 py-0.5 rounded-full text-foreground-muted font-mono">
              {orderNo}
            </span>
          </div>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground text-xl transition-colors">
            ✕
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Success ── */}
          {state === 'success' && (
            <m.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-12 px-6 text-center"
            >
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-success/10 border border-success/30 flex items-center justify-center"
              >
                <span className="text-4xl">✅</span>
              </m.div>
              <h3 className="text-xl font-bold text-foreground">Төлбөр амжилттай!</h3>
              <p className="text-foreground-muted text-sm">{fmt(total)} төлөгдлөө</p>
              <div className="w-8 h-1 rounded-full bg-success/40 animate-pulse mt-2" />
            </m.div>
          )}

          {/* ── Expired ── */}
          {state === 'expired' && (
            <m.div
              key="expired"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-12 px-6 text-center"
            >
              <span className="text-5xl">⏰</span>
              <h3 className="text-lg font-bold text-foreground">Хугацаа дууслаа</h3>
              <p className="text-sm text-foreground-muted">QPay invoice-ийн хугацаа дууссан. Дахин оролдоно уу.</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-hover"
              >
                Хаах
              </button>
            </m.div>
          )}

          {/* ── Waiting / QR ── */}
          {state === 'waiting' && (
            <m.div
              key="qr"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 space-y-4"
            >
              {/* Amount + timer */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground-muted">Нийт дүн</p>
                  <p className="text-2xl font-extrabold text-foreground">{fmt(total)}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-mono font-semibold ${
                  secs < 60
                    ? 'border-error/30 bg-error/10 text-error'
                    : 'border-[var(--glass-border)] text-foreground-muted'
                }`}>
                  ⏱ {formatTime(secs)}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center">
                <div className="relative p-4 bg-white rounded-2xl shadow-inner">
                  <QRCodeSVG
                    value={qrValue}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#0A0A0F"
                    level="M"
                    includeMargin={false}
                  />
                  {/* QPay logo overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg">📱</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-foreground-muted mt-2 text-center">
                  QPay апп-аа нээж QR кодыг уншуулна уу
                </p>
              </div>

              {/* Bank deep links */}
              <div>
                <p className="text-xs text-foreground-muted mb-2 font-medium">Эсвэл банкны апп сонгох:</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {BANKS.map((bank) => (
                    <a
                      key={bank.short}
                      href="#" // TODO: Replace with real deep link from QPay invoice URLs
                      onClick={(e) => e.preventDefault()}
                      title={bank.name}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-opacity hover:opacity-80 ${bank.color}`}
                    >
                      <span className="text-base">{bank.emoji}</span>
                      <span className="text-[9px] font-medium leading-tight">{bank.short}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Dev simulate button */}
              {IS_DEV && (
                <div className="pt-2 border-t border-[var(--glass-border)]">
                  <p className="text-[10px] text-foreground-muted/60 text-center mb-2 uppercase tracking-wider font-mono">
                    🛠 Development mode only
                  </p>
                  <button
                    onClick={handleSimulate}
                    disabled={simulating}
                    className="w-full py-2.5 rounded-xl border border-success/30 bg-success/10 text-success text-sm font-semibold hover:bg-success/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-success/30 border-t-success rounded-full animate-spin" />
                        Банк боловсруулж байна... (5с)
                      </>
                    ) : (
                      '✓ Төлбөр дуурайх'
                    )}
                  </button>
                </div>
              )}
            </m.div>
          )}

        </AnimatePresence>
      </m.div>
    </div>
  );
}
