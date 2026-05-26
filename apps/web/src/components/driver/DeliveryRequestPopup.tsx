'use client';

import { useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import type { ActiveDelivery } from '@/lib/driver-store';

export const MOCK_DELIVERY_REQUEST: ActiveDelivery = {
  id: 'delivery-dev-001',
  orderId: 'ORD-2026-0526',
  customerName: 'Бат-Эрдэнэ',
  customerPhone: '99112233',
  dropoffAddress: 'Чингэлтэй, 3-р хороо, 12-р байр',
  dropoffLat: 47.9268,
  dropoffLng: 106.9145,
  distance: 4.2,
  estimatedDuration: 25,
  fee: 850000,
  status: 'REQUESTED',
  pickupStops: [
    {
      supplierId: 'sup-001',
      supplierName: 'Ганцоо барилгын материал',
      address: 'Баянзүрх дүүрэг',
      lat: 47.9185,
      lng: 106.9403,
      status: 'PENDING',
    },
    {
      supplierId: 'sup-002',
      supplierName: 'Төмөр зах',
      address: 'Сүхбаатар дүүрэг',
      lat: 47.9208,
      lng: 106.9279,
      status: 'PENDING',
    },
  ],
};

export default function DeliveryRequestPopup({
  open,
  onAccept,
  onReject,
}: {
  open: boolean;
  onAccept: (delivery: ActiveDelivery) => void;
  onReject: () => void;
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
                <p className="mb-2 text-xs font-semibold text-foreground-muted">Авах цэгүүд</p>
                <div className="space-y-2">
                  {MOCK_DELIVERY_REQUEST.pickupStops.map((stop) => (
                    <div key={stop.supplierId} className="flex items-center gap-2 text-sm text-foreground">
                      <span>📍</span>
                      <span>{stop.supplierName} - {stop.address.replace(' дүүрэг', '')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="mb-1 text-xs font-semibold text-foreground-muted">Хүргэх</p>
                <p className="text-sm text-foreground">🏠 Чингэлтэй, 3-р хороо</p>
              </div>
            </div>

            <div className="my-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-lg font-black text-foreground">4.2 км</p>
                <p className="text-[11px] text-foreground-muted">Зай</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-lg font-black text-foreground">2</p>
                <p className="text-[11px] text-foreground-muted">Дэлгүүр</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-lg font-black text-foreground">~25</p>
                <p className="text-[11px] text-foreground-muted">Минут</p>
              </div>
            </div>

            <p className="mb-5 text-center text-4xl font-black text-brand">₮8,500</p>

            <div className="space-y-2">
              <button
                onClick={() => onAccept(MOCK_DELIVERY_REQUEST)}
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
