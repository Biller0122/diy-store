'use client';

import { useEffect, useState } from 'react';
import { MapPin, Clock, Package, CheckCircle2 } from 'lucide-react';
import { useDriverStore } from '@/lib/driver-store';
import { vendureShopFetch } from '@/lib/vendure';

type DeliveryOffer = {
  id: string;
  orderId: string;
  customer: string;
  customerPhone: string;
  distance: number;
  pickups: { supplier: string; address: string; lat: number; lng: number }[];
  dropoff: string;
  dropoffLat: number;
  dropoffLng: number;
  fee: number;
  estimatedMin: number;
  postedMin: number;
};

const MOCK_AVAILABLE: DeliveryOffer[] = [
  {
    id: 'DEL-001',
    orderId: 'DEL-001',
    customer: 'Дорж Б.',
    customerPhone: '+97699001122',
    distance: 2.4,
    pickups: [
      { supplier: 'БудагМаркет ХХК', address: 'Баянзүрх, Барилгачдын гудамж 15', lat: 47.92, lng: 106.93 },
      { supplier: 'Тоног Хэрэгсэл ХХК', address: 'Сүхбаатар, Гэгээн Өндөр 22', lat: 47.925, lng: 106.935 },
    ],
    dropoff: 'Баянзүрх, 10-р хороо, Нарны зам 5а',
    dropoffLat: 47.9154,
    dropoffLng: 106.9214,
    fee: 800000,
    estimatedMin: 25,
    postedMin: 3,
  },
  {
    id: 'DEL-002',
    orderId: 'DEL-002',
    customer: 'Ганаа Н.',
    customerPhone: '+97699001122',
    distance: 1.8,
    pickups: [{ supplier: 'СантехникПро', address: 'Хан-Уул, Сонсголон 8', lat: 47.91, lng: 106.9 }],
    dropoff: 'Сүхбаатар, 8-р хороо, Хүслийн гудамж 12',
    dropoffLat: 47.9154,
    dropoffLng: 106.9214,
    fee: 600000,
    estimatedMin: 18,
    postedMin: 7,
  },
  {
    id: 'DEL-003',
    orderId: 'DEL-003',
    customer: 'Болд Э.',
    customerPhone: '+97699001122',
    distance: 3.2,
    pickups: [
      { supplier: 'ЦахилгаанДэлгүүр', address: 'Баянгол, Чингисийн өргөн чөлөө 45', lat: 47.91, lng: 106.9 },
      { supplier: 'Шал & Хана', address: 'Чингэлтэй, Их Тойруу 12', lat: 47.925, lng: 106.91 },
      { supplier: 'МеталлТрейд', address: 'Налайх, Уурхайчдын гудамж 5', lat: 47.78, lng: 107.25 },
    ],
    dropoff: 'Хан-Уул, 14-р хороо, Буянт-Ухаа 3',
    dropoffLat: 47.9154,
    dropoffLng: 106.9214,
    fee: 1200000,
    estimatedMin: 45,
    postedMin: 1,
  },
];

const AVAILABLE_DELIVERIES_QUERY = `
  query AvailableDeliveries {
    availableDeliveries {
      id
      orderId
      customerName
      customerPhone
      pickupStops {
        supplierId
        supplierName
        address
        lat
        lng
      }
      dropoffAddress
      dropoffLat
      dropoffLng
      distance
      estimatedDuration
      proposedFee
      createdAt
    }
  }
`;

const ACCEPT_DELIVERY_MUTATION = `
  mutation AcceptDelivery($deliveryId: ID!, $driverId: String!) {
    acceptDelivery(deliveryId: $deliveryId, driverId: $driverId) {
      id
      status
    }
  }
`;

export default function DriverDeliveriesPage() {
  const { driver, isOnline, setActiveDelivery } = useDriverStore();
  const [accepted, setAccepted] = useState<string | null>(null);
  const [offers, setOffers] = useState<DeliveryOffer[]>(MOCK_AVAILABLE);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOnline) return;
    let mounted = true;
    async function loadOffers() {
      try {
        const data = await vendureShopFetch<{
          availableDeliveries: {
            id: string;
            orderId: string;
            customerName: string;
            customerPhone: string;
            pickupStops: { supplierName: string; address: string; lat: number; lng: number }[];
            dropoffAddress: string;
            dropoffLat: number;
            dropoffLng: number;
            distance: number;
            estimatedDuration: number;
            proposedFee: number;
            createdAt: string;
          }[];
        }>(AVAILABLE_DELIVERIES_QUERY);
        if (!mounted) return;
        setOffers(data.availableDeliveries.map((delivery) => ({
          id: delivery.id,
          orderId: delivery.orderId,
          customer: delivery.customerName || 'Хэрэглэгч',
          customerPhone: delivery.customerPhone,
          distance: delivery.distance || 2.4,
          pickups: delivery.pickupStops.map((stop) => ({
            supplier: stop.supplierName,
            address: stop.address,
            lat: stop.lat,
            lng: stop.lng,
          })),
          dropoff: delivery.dropoffAddress,
          dropoffLat: delivery.dropoffLat,
          dropoffLng: delivery.dropoffLng,
          fee: delivery.proposedFee,
          estimatedMin: delivery.estimatedDuration,
          postedMin: Math.max(1, Math.round((Date.now() - new Date(delivery.createdAt).getTime()) / 60000)),
        })));
        setError('');
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Хүргэлт татахад алдаа гарлаа');
      }
    }
    void loadOffers();
    const interval = window.setInterval(loadOffers, 15_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [isOnline]);

  async function handleAccept(id: string) {
    const offer = offers.find((o) => o.id === id);
    if (!offer) return;
    setAccepted(id);
    if (driver?.id) {
      await vendureShopFetch(ACCEPT_DELIVERY_MUTATION, { deliveryId: id, driverId: driver.id }).catch((err) => {
        setError(err instanceof Error ? err.message : 'Хүргэлт авахад алдаа гарлаа');
      });
    }
    setActiveDelivery({
      id: offer.id,
      orderId: offer.orderId,
      customerName: offer.customer,
      customerPhone: offer.customerPhone,
      dropoffAddress: offer.dropoff,
      dropoffLat: offer.dropoffLat,
      dropoffLng: offer.dropoffLng,
      pickupStops: offer.pickups.map((p) => ({
        supplierId: p.supplier,
        supplierName: p.supplier,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
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
        <p className="text-sm text-foreground-muted mt-0.5">{offers.length} захиалга байна</p>
      </div>

      {error && (
        <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {offers.map((offer) => {
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
