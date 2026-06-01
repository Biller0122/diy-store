'use client';

import { useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Phone, X } from 'lucide-react';
import type { ActiveDelivery } from '@/lib/driver-store';

export default function DeliveryRequestPopup({
  open,
  onAccept,
  onReject,
  request,
}: {
  open: boolean;
  onAccept: (delivery: ActiveDelivery) => void;
  onReject: () => void;
  request?: ActiveDelivery;
}) {
  const [seconds, setSeconds] = useState(30);
  const progress = useMemo(() => Math.max(0, (seconds / 30) * 100), [seconds]);

  useEffect(() => {
    if (!open) return;
    const resetTimer = window.setTimeout(() => setSeconds(30), 0);
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          window.setTimeout(onReject, 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearInterval(interval);
    };
  }, [open, onReject]);

  if (!request) return null;
  const delivery = request;
  const feeDisplay = `₮${Math.round(delivery.fee / 100).toLocaleString()}`;

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
        >
          <m.div
            data-testid="order-popup"
            initial={{ y: 90, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 90, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="w-full max-w-md rounded-[2rem] border border-white/15 bg-[#111315]/95 p-5 shadow-2xl shadow-black/50"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-brand" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand">Шинэ захиалга</p>
                </div>
                <h2 className="text-2xl font-black text-foreground">Хүргэлт ирлээ!</h2>
                {delivery.orderNumber && (
                  <p data-testid="popup-order-number" className="mt-0.5 font-mono text-xs text-foreground-muted">{delivery.orderNumber}</p>
                )}
              </div>
              <div className="relative h-14 w-14 shrink-0">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="19" stroke="rgba(255,255,255,.14)" strokeWidth="4" fill="none" />
                  <circle
                    cx="22"
                    cy="22"
                    r="19"
                    stroke="#22c55e"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 19}`}
                    strokeDashoffset={`${2 * Math.PI * 19 * (1 - progress / 100)}`}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-sm font-black text-foreground">{seconds}</span>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground-muted">Авах цэгүүд ({delivery.pickupStops.length})</p>
                <div className="space-y-3">
                  {delivery.pickupStops.map((stop, i) => (
                    <div key={stop.supplierId} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-brand/20 text-brand text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{stop.supplierName}</p>
                            <p className="text-xs text-foreground-muted">{stop.address}</p>
                          </div>
                        </div>
                        {stop.phone && (
                          <a href={`tel:${stop.phone}`} className="shrink-0 w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center text-success hover:bg-success/25">
                            <Phone size={13} />
                          </a>
                        )}
                      </div>
                      {stop.items && stop.items.length > 0 && (
                        <div className="ml-7 flex flex-wrap gap-1">
                          {stop.items.map((item, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-foreground-muted border border-white/10">
                              {item.name} × {item.qty}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="mb-1 text-xs font-semibold text-foreground-muted">Хүргэх хаяг</p>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">🏠 {delivery.customerName}</p>
                    <p className="text-xs text-foreground-muted">{delivery.dropoffAddress}</p>
                  </div>
                  {delivery.customerPhone && (
                    <a href={`tel:${delivery.customerPhone}`} className="shrink-0 w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center text-success hover:bg-success/25">
                      <Phone size={13} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="my-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-lg font-black text-foreground">{delivery.distance.toFixed(1)} км</p>
                <p className="text-[11px] text-foreground-muted">Зай</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-lg font-black text-foreground">{delivery.pickupStops.length}</p>
                <p className="text-[11px] text-foreground-muted">Дэлгүүр</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-lg font-black text-foreground">~{delivery.estimatedDuration}</p>
                <p className="text-[11px] text-foreground-muted">Минут</p>
              </div>
            </div>

            <p className="mb-5 text-center text-4xl font-black text-brand">{feeDisplay}</p>

            <div className="space-y-2">
              <button
                onClick={() => onAccept(delivery)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-4 text-base font-black text-white shadow-lg shadow-success/20 transition hover:brightness-110"
              >
                <CheckCircle2 size={20} /> Хүлээн авах
              </button>
              <button
                onClick={onReject}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-sm font-bold text-foreground-muted transition hover:bg-white/[0.07] hover:text-foreground"
              >
                <X size={16} /> Татгалзах
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
