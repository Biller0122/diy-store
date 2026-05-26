'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Navigation, Star, Wallet } from 'lucide-react';
import DeliveryRequestPopup from '@/components/driver/DeliveryRequestPopup';
import { useDriverStore, VEHICLE_LABEL } from '@/lib/driver-store';

const RECENT_DELIVERIES = [
  { id: 'D-1092', address: 'Чингэлтэй, 3-р хороо', amount: 850000, time: '12:40' },
  { id: 'D-1091', address: 'Баянзүрх, 10-р хороо', amount: 650000, time: '11:15' },
  { id: 'D-1090', address: 'Хан-Уул, 15-р хороо', amount: 920000, time: '09:50' },
  { id: 'D-1089', address: 'Сүхбаатар, 8-р хороо', amount: 700000, time: 'Өчигдөр' },
  { id: 'D-1088', address: 'Баянгол, 6-р хороо', amount: 780000, time: 'Өчигдөр' },
];

export default function DriverDashboardPage() {
  const { driver, isOnline, activeDelivery, setOnlineStatus, setActiveDelivery } = useDriverStore();
  const [showRequest, setShowRequest] = useState(false);

  useEffect(() => {
    if (!isOnline || activeDelivery) return;
    const timer = window.setTimeout(() => setShowRequest(true), 10000);
    return () => window.clearTimeout(timer);
  }, [activeDelivery, isOnline]);

  const rejectRequest = useCallback(() => setShowRequest(false), []);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section
        className={`rounded-[2rem] border p-6 text-center transition-all ${
          isOnline
            ? 'border-success/40 bg-success/10 shadow-2xl shadow-success/10'
            : 'border-[var(--glass-border)] bg-card'
        }`}
      >
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/[0.04]">
          <div className={`h-16 w-16 rounded-full ${isOnline ? 'animate-pulse bg-success shadow-lg shadow-success/40' : 'bg-foreground-muted/30'}`} />
        </div>
        <h2 className="text-2xl font-black text-foreground">
          {isOnline ? 'Онлайн байна - Захиалга хүлээж байна...' : 'Офлайн байна'}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          {isOnline ? 'Шинэ хүргэлт ирэхэд дэлгэц дээр шууд мэдэгдэнэ.' : 'Захиалга авахын тулд онлайн болно уу'}
        </p>
        <button
          onClick={() => setOnlineStatus(!isOnline)}
          className={`mt-6 rounded-2xl px-8 py-4 text-base font-black text-white transition ${
            isOnline ? 'bg-foreground-muted hover:bg-foreground-muted/80' : 'bg-success shadow-lg shadow-success/20 hover:brightness-110'
          }`}
        >
          {isOnline ? 'Офлайн болох' : 'Онлайн болох'}
        </button>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[
          { icon: Navigation, label: 'Хүргэлт', value: '7' },
          { icon: Wallet, label: 'Орлого', value: '₮24,500' },
          { icon: Star, label: 'Үнэлгээ', value: `★ ${driver?.rating ?? '5.0'}` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
            <Icon className="mb-3 text-brand" size={18} />
            <p className="text-[11px] text-foreground-muted">{label}</p>
            <p className="mt-1 text-lg font-black text-foreground">{value}</p>
          </div>
        ))}
      </section>

      {activeDelivery && (
        <section className="rounded-2xl border border-brand/30 bg-brand/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">Идэвхтэй хүргэлт</p>
              <h3 className="mt-1 text-lg font-black text-foreground">{activeDelivery.customerName}</h3>
              <p className="mt-1 text-sm text-foreground-muted">{activeDelivery.dropoffAddress}</p>
              <p className="mt-3 text-xs text-foreground-muted">
                {activeDelivery.pickupStops.map((stop) => stop.supplierName).join(', ')} - бараа авах
              </p>
            </div>
            <Link href="/driver/active-delivery" className="shrink-0 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white">
              Хүргэлт үзэх
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground">Сүүлийн хүргэлтүүд</h3>
            <p className="text-xs text-foreground-muted">
              {VEHICLE_LABEL[driver?.vehicleType ?? 'MOTORCYCLE']} · {driver?.vehiclePlate || 'Тээврийн мэдээлэл хүлээгдэж байна'}
            </p>
          </div>
          <Link href="/driver/earnings" className="flex items-center gap-1 text-xs font-bold text-brand">
            Орлого <ArrowRight size={13} />
          </Link>
        </div>
        <div className="space-y-2">
          {RECENT_DELIVERIES.map((delivery) => (
            <div key={delivery.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{delivery.address}</p>
                <p className="text-xs text-foreground-muted">{delivery.time}</p>
              </div>
              <p className="text-sm font-black text-success">₮{Math.round(delivery.amount / 100).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <DeliveryRequestPopup
        open={showRequest && isOnline && !activeDelivery}
        onReject={rejectRequest}
        onAccept={(delivery) => {
          setActiveDelivery(delivery);
          setShowRequest(false);
        }}
      />
    </div>
  );
}
