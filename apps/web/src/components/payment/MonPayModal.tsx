'use client';

import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

const IS_DEV = process.env.NODE_ENV === 'development';
const COUNTDOWN_SECS = 300; // 5 minutes for MonPay

interface MonPayModalProps {
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

const MOCK_QR_VALUE = (orderNo: string, amount: number) =>
  `monpay://q?invoice=MOCK-${orderNo}&amount=${Math.round(amount / 100)}`;

export function MonPayModal({ orderNo, total, onSuccess, onClose }: MonPayModalProps) {
  const [state, setState] = useState<ModalState>('waiting');
  const [secs, setSecs] = useState(COUNTDOWN_SECS);
  const [simulating, setSimulating] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const qrValue  = MOCK_QR_VALUE(orderNo, total);
  const deepLink = qrValue; // same string used as deeplink in real mode
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

  // ── Poll (prod only) ──
  useEffect(() => {
    if (IS_DEV) return;
    // TODO: Replace with real MonPay polling when backend is live
    return () => { clearInterval(pollRef.current!); };
  }, []);

  const handleSuccess = () => {
    clearInterval(pollRef.current!);
    clearInterval(countRef.current!);
    setState('success');
    setTimeout(onSuccess, 1800);
  };

  const handleSimulate = async () => {
    setSimulating(true);
    await new Promise((r) => setTimeout(r, 5000));
    handleSuccess();
  };

  const handleOpenApp = () => {
    window.location.href = deepLink;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-md bg-card border border-[var(--glass-border)] rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)] bg-gradient-to-r from-sky-500/5 to-transparent">
          <div className="flex items-center gap-2">
            <span className="text-xl">💳</span>
            <span className="font-bold text-foreground">MonPay</span>
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
              <p className="text-foreground-muted text-sm">{fmt(total)} MonPay-ээр төлөгдлөө</p>
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
              <p className="text-sm text-foreground-muted">MonPay invoice-ийн хугацаа дууссан. Дахин оролдоно уу.</p>
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

              {/* QR code */}
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
                  {/* MonPay logo overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg font-bold text-xs">MP</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-foreground-muted mt-2 text-center">
                  MonPay апп-аа нээж QR кодыг уншуулна уу
                </p>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleOpenApp}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-semibold hover:bg-sky-500/20 transition-colors"
                >
                  <span>📱</span>
                  <span>Апп нээх</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-foreground-muted text-sm font-semibold hover:text-foreground transition-colors"
                >
                  <span>{copied ? '✓' : '📋'}</span>
                  <span>{copied ? 'Хуулагдлаа' : 'Линк хуулах'}</span>
                </button>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-info/5 border border-info/20">
                <span className="text-info mt-0.5 text-sm">ℹ</span>
                <div className="text-xs text-foreground-muted leading-relaxed">
                  <span className="text-foreground font-medium">MonPay апп</span> ашиглан QR код уншуулах эсвэл{' '}
                  <span className="text-foreground font-medium">"Апп нээх"</span> товчийг дарна уу.
                  Төлбөр автоматаар баталгаажих болно.
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
                        MonPay боловсруулж байна... (5с)
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
