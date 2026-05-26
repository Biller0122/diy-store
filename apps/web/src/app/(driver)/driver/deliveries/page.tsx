'use client';

import { useState } from 'react';
import { MapPin, Clock, Package, CheckCircle2 } from 'lucide-react';
import { useDriverStore } from '@/lib/driver-store';

const MOCK_AVAILABLE = [
  {
    id: 'DEL-001',
    customer: 'Дорж Б.',
    distance: 2.4,
    pickups: [
      { supplier: 'БудагМаркет ХХК', address: 'Баянзүрх, Барилгачдын гудамж 15' },
      { supplier: 'Тоног Хэрэгсэл ХХК', address: 'Сүхбаатар, Гэгээн Өндөр 22' },
    ],
    dropoff: 'Баянзүрх, 10-р хороо, Нарны зам 5а',
    fee: 800000,
    estimatedMin: 25,
    postedMin: 3,
  },
  {
    id: 'DEL-002',
    customer: 'Ганаа Н.',
    distance: 1.8,
    pickups: [{ supplier: 'СантехникПро', address: 'Хан-Уул, Сонсголон 8' }],
    dropoff: 'Сүхбаатар, 8-р хороо, Хүслийн гудамж 12',
    fee: 600000,
    estimatedMin: 18,
    postedMin: 7,
  },
  {
    id: 'DEL-003',
    customer: 'Болд Э.',
    distance: 3.2,
    pickups: [
      { supplier: 'ЦахилгаанДэлгүүр', address: 'Баянгол, Чингисийн өргөн чөлөө 45' },
      { supplier: 'Шал & Хана', address: 'Чингэлтэй, Их Тойруу 12' },
      { supplier: 'МеталлТрейд', address: 'Налайх, Уурхайчдын гудамж 5' },
    ],
    dropoff: 'Хан-Уул, 14-р хороо, Буянт-Ухаа 3',
    fee: 1200000,
    estimatedMin: 45,
    postedMin: 1,
  },
];

export default function DriverDeliveriesPage() {
  const { isOnline, setActiveDelivery } = useDriverStore();
  const [accepted, setAccepted] = useState<string | null>(null);

  function handleAccept(id: string) {
    const offer = MOCK_AVAILABLE.find((o) => o.id === id);
    if (!offer) return;
    setAccepted(id);
    setActiveDelivery({
      id: offer.id,
      orderId: offer.id,
      customerName: offer.customer,
      customerPhone: '+97699001122',
      dropoffAddress: offer.dropoff,
      dropoffLat: 47.9154,
      dropoffLng: 106.9214,
      pickupStops: offer.pickups.map((p) => ({
        supplierId: p.supplier,
        supplierName: p.supplier,
        address: p.address,
        lat: 47.92,
        lng: 106.93,
        status: 'PENDING',
      })),
      distance: offer.distance,
      estimatedDuration: offer.estimatedMin,
      fee: offer.fee,
      status: 'ACCEPTED',
    });
  }

  if (!isOnline) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">⚫</p>
        <p className="text-foreground font-semibold mb-2">Та оффлайн байна</p>
        <p className="text-sm text-foreground-muted">Захиалга харахын тулд онлайн болоорой</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Боломжит захиалгууд</h2>
        <p className="text-sm text-foreground-muted mt-0.5">{MOCK_AVAILABLE.length} захиалга байна</p>
      </div>

      <div className="space-y-3">
        {MOCK_AVAILABLE.map((offer) => {
          const isAccepted = accepted === offer.id;
          return (
            <div key={offer.id} className={`bg-card border rounded-2xl p-4 transition-all ${isAccepted ? 'border-success/40 bg-success/5' : 'border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-foreground">#{offer.id}</p>
                    {offer.postedMin <= 5 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/15 text-brand font-semibold">Шинэ</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5">{offer.postedMin} мин өмнө нийтлэгдсэн</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black text-brand">₮{Math.round(offer.fee / 100).toLocaleString()}</p>
                  <p className="text-xs text-foreground-muted">{offer.distance} км</p>
                </div>
              </div>

              {/* Pickup stops */}
              <div className="mb-3 space-y-2">
                {offer.pickups.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="w-5 h-5 rounded-full bg-brand/20 text-brand flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{p.supplier}</p>
                      <p className="text-foreground-muted">{p.address}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={10} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Хүргэх хаяг</p>
                    <p className="text-foreground-muted">{offer.dropoff}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--glass-border)]">
                <div className="flex items-center gap-3 text-xs text-foreground-muted">
                  <span className="flex items-center gap-1"><Clock size={11} /> ~{offer.estimatedMin} мин</span>
                  <span className="flex items-center gap-1"><Package size={11} /> {offer.pickups.length} дэлгүүр</span>
                </div>
                {isAccepted ? (
                  <div className="flex items-center gap-1.5 text-success text-xs font-semibold">
                    <CheckCircle2 size={14} /> Хүлээн авсан
                  </div>
                ) : (
                  <button
                    onClick={() => handleAccept(offer.id)}
                    className="px-5 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors shadow-md shadow-brand/20"
                  >
                    Хүлээн авах
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
