'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';
import {
  Phone, ArrowLeft, CheckCircle2, Clock, Circle,
  Navigation, Star, ChevronUp,
} from 'lucide-react';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';

interface Props {
  params: Promise<{ orderId: string }>;
}

type DeliveryStatus = 'SEARCHING' | 'OFFERED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface DispatchData {
  status: DeliveryStatus;
  orderNumber?: string;
  driver?: {
    id: string; name: string; phone: string;
    vehicleType: string; vehiclePlate: string; rating: number;
    lat: number; lng: number;
  };
  estimatedArrivalMinutes?: number;
  deliveryCode?: string;
  completedAt?: string;
  driverLat?: number;
  driverLng?: number;
  pickupStops?: { supplierName: string; address: string; status: 'PENDING' | 'PICKED_UP' }[];
}

const STATUS_STEPS = [
  { key: 'SEARCHING',   label: 'Жолооч хайж байна',         icon: Clock },
  { key: 'OFFERED',     label: 'Жолооч санал хүргэж байна', icon: Clock },
  { key: 'ACCEPTED',    label: 'Жолооч хүлээж авлаа',       icon: CheckCircle2 },
  { key: 'IN_PROGRESS', label: 'Хүргэж байна',               icon: Navigation },
  { key: 'COMPLETED',   label: 'Хүргэгдлээ',                 icon: CheckCircle2 },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

const MOCK_PICKUP_STOPS = [
  { supplierName: 'БудагМаркет ХХК', address: 'Баянзүрх, Барилгачдын гудамж 15', status: 'PICKED_UP' as const },
  { supplierName: 'Тоног Хэрэгсэл ХХК', address: 'Сүхбаатар, Гэгээн Өндөр 22', status: 'PICKED_UP' as const },
];

const CUSTOMER_POS = { lat: 47.9154, lng: 106.9214 };

// ─── Map ──────────────────────────────────────────────────────

function DeliveryMap({
  driverLat, driverLng, status,
}: {
  driverLat: number; driverLng: number; status: DeliveryStatus;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const driverMarkerRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = (L as typeof import('leaflet')).map(mapRef.current!, {
        center: [driverLat, driverLng],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      // Customer pin
      const customerIcon = L.divIcon({
        html: `<div style="width:36px;height:36px;border-radius:50%;background:#3B82F6;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🏠</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18], className: '',
      });
      L.marker([CUSTOMER_POS.lat, CUSTOMER_POS.lng], { icon: customerIcon })
        .addTo(map).bindPopup('Таны хаяг');

      // Driver pin
      const driverIcon = L.divIcon({
        html: `<div style="width:40px;height:40px;border-radius:50%;background:#FF4500;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 12px rgba(255,69,0,0.5)">🏍️</div>`,
        iconSize: [40, 40], iconAnchor: [20, 20], className: '',
      });
      const driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
        .addTo(map).bindPopup('Жолооч');
      driverMarkerRef.current = driverMarker;

      // Dashed route line
      L.polyline([[driverLat, driverLng], [CUSTOMER_POS.lat, CUSTOMER_POS.lng]], {
        color: '#FF4500', weight: 3, dashArray: '8 6', opacity: 0.7,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      (mapInstanceRef.current as { remove?: () => void })?.remove?.();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate driver marker
  useEffect(() => {
    if (!driverMarkerRef.current) return;
    (driverMarkerRef.current as { setLatLng: (pos: [number, number]) => void }).setLatLng([driverLat, driverLng]);
  }, [driverLat, driverLng]);

  if (status === 'SEARCHING' || status === 'OFFERED') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-dark">
        <div className="w-16 h-16 rounded-full border-4 border-brand/30 border-t-brand animate-spin" />
        <p className="text-sm text-foreground-muted">
          {status === 'SEARCHING' ? 'Жолооч хайж байна...' : 'Жолоочид санал илгээж байна...'}
        </p>
      </div>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
}

// ─── Rating modal ─────────────────────────────────────────────

function RatingModal({ onClose, driverName }: { onClose: () => void; driverName: string }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    setSubmitted(true);
    setTimeout(onClose, 1500);
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <m.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-sm rounded-3xl bg-card border border-[var(--glass-border)] p-6 text-center"
      >
        {submitted ? (
          <div className="py-4">
            <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <p className="font-bold text-foreground">Баярлалаа!</p>
            <p className="text-sm text-foreground-muted mt-1">Таны үнэлгээ хадгалагдлаа.</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-brand/15 flex items-center justify-center text-3xl mx-auto mb-4">🏍️</div>
            <h3 className="text-base font-bold text-foreground mb-1">Жолоочийг үнэлнэ үү</h3>
            <p className="text-sm text-foreground-muted mb-5">{driverName}</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}
                >
                  <Star
                    size={32}
                    className={`transition-colors ${s <= (hovered || rating) ? 'text-amber fill-amber' : 'text-foreground-muted'}`}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 rounded-xl border border-[var(--glass-border)] py-3 text-sm text-foreground-muted hover:bg-dark">
                Алгасах
              </button>
              <button
                onClick={submit}
                disabled={rating === 0}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                Илгээх ✓
              </button>
            </div>
          </>
        )}
      </m.div>
    </m.div>
  );
}

// ─── Status panel ─────────────────────────────────────────────

function StatusPanel({ orderId, data, sheetOpen, onToggleSheet }: {
  orderId: string;
  data: DispatchData;
  sheetOpen: boolean;
  onToggleSheet: () => void;
}) {
  const currentIdx = STATUS_ORDER.indexOf(data.status);
  const driver = data.driver;

  const vehicleEmoji =
    driver?.vehicleType === 'MOTORCYCLE' ? '🏍️' :
    driver?.vehicleType === 'CAR' ? '🚗' :
    driver?.vehicleType === 'VAN' ? '🚐' : '🚚';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--glass-border)] shrink-0">
        <Link href="/account/orders" className="text-foreground-muted hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm text-foreground truncate font-mono">
            {data.orderNumber ?? `#${orderId.slice(0, 12)}`}
          </h1>
          <p className="text-xs text-foreground-muted">Шууд хянах</p>
        </div>
        {/* Mobile collapse toggle */}
        <button onClick={onToggleSheet} className="lg:hidden text-foreground-muted">
          <ChevronUp size={18} className={`transition-transform ${sheetOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* ETA */}
      <div className="m-4 p-4 rounded-2xl bg-brand/10 border border-brand/20 text-center shrink-0">
        <p className="text-xs text-foreground-muted mb-1">Ойролцоо ирэх хугацаа</p>
        {data.status === 'SEARCHING' || data.status === 'OFFERED' ? (
          <p className="text-lg font-bold text-foreground-muted animate-pulse">Жолооч хайж байна...</p>
        ) : data.status === 'COMPLETED' ? (
          <p className="text-2xl font-black text-success">Хүргэгдлээ ✓</p>
        ) : (
          <p className="text-3xl font-black text-brand font-mono">~{data.estimatedArrivalMinutes ?? 15} мин</p>
        )}
      </div>

      {/* Driver info */}
      {data.deliveryCode && data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && (
        <div className="mx-4 mb-4 rounded-2xl border border-brand/30 bg-brand/10 p-4 text-center shrink-0">
          <p className="text-xs font-semibold text-foreground-muted">Бараа авахдаа жолоочид хэлэх буулгах код</p>
          <p className="mt-2 font-mono text-3xl font-black tracking-[0.35em] text-brand">{data.deliveryCode}</p>
        </div>
      )}

      {/* Driver info */}
      {driver && (
        <div className="mx-4 mb-4 p-4 rounded-2xl bg-surface border border-[var(--glass-border)] shrink-0">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">Жолооч</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center text-xl shrink-0">
              {vehicleEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <p data-testid="driver-name" className="font-semibold text-sm text-foreground">{driver.name}</p>
              <p className="text-xs text-foreground-muted">{driver.vehiclePlate}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={11} className="text-amber fill-amber" />
                <span className="text-xs font-semibold text-foreground">{driver.rating}</span>
              </div>
            </div>
            <a href={`tel:${driver.phone}`}
              className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center text-success hover:bg-success/25 transition-colors shrink-0">
              <Phone size={15} />
            </a>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="mx-4 mb-4">
        <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">Явц</p>
        <div className="space-y-0">
          {STATUS_STEPS.map((step, idx) => {
            const done = idx <= currentIdx;
            const active = idx === currentIdx;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    done ? 'bg-brand text-white' : 'bg-surface border border-[var(--glass-border)] text-foreground-muted'
                  }`}>
                    {done ? <Icon size={12} /> : <Circle size={12} />}
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 h-6 my-0.5 transition-colors ${idx < currentIdx ? 'bg-brand' : 'bg-[var(--glass-border)]'}`} />
                  )}
                </div>
                <p className={`text-sm pt-0.5 pb-4 ${active ? 'text-brand font-semibold' : done ? 'text-foreground' : 'text-foreground-muted'}`}>
                  {step.label}
                  {active && <span className="ml-2 text-xs animate-pulse">●</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pickup stops */}
      <div className="mx-4 mb-4 p-4 rounded-2xl bg-surface border border-[var(--glass-border)]">
        <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">Авах цэгүүд</p>
        <div className="space-y-3">
          {(data.pickupStops ?? MOCK_PICKUP_STOPS).map((stop, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                stop.status === 'PICKED_UP' ? 'bg-success text-white' : 'bg-amber/20 text-amber border border-amber/30'
              }`}>
                {stop.status === 'PICKED_UP' ? '✓' : i + 1}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{stop.supplierName}</p>
                <p className="text-[11px] text-foreground-muted">{stop.address}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2.5 pt-2 border-t border-[var(--glass-border)]">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center text-xs shrink-0 mt-0.5">
              🏠
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Таны хаяг</p>
              <p className="text-[11px] text-foreground-muted">Баянзүрх дүүрэг, 10-р хороо</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export default function TrackOrderPage({ params }: Props) {
  const { orderId } = use(params);
  const [data, setData] = useState<DispatchData>({ status: 'SEARCHING' });
  const [sheetOpen, setSheetOpen] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const ratingShownRef = useRef(false);

  const { handleStatusChange } = useOrderNotifications(orderId, true);

  // Simulate driver position when IN_PROGRESS
  const [driverPos, setDriverPos] = useState({ lat: 47.9231, lng: 106.9350 });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${orderId}/dispatch-status`);
      if (!res.ok) return;
      const json = await res.json() as DispatchData;
      setData(json);
      handleStatusChange(json.status);

      if (json.driverLat && json.driverLng) {
        setDriverPos({ lat: json.driverLat, lng: json.driverLng });
      }

      if (json.status === 'COMPLETED' && !ratingShownRef.current) {
        ratingShownRef.current = true;
        setTimeout(() => setShowRating(true), 1000);
      }
    } catch {
      // ignore
    }
  }, [orderId, handleStatusChange]);

  // 5-second polling
  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Animate driver toward customer if IN_PROGRESS
  useEffect(() => {
    if (data.status !== 'IN_PROGRESS') return;
    const interval = setInterval(() => {
      setDriverPos((prev) => ({
        lat: prev.lat + (CUSTOMER_POS.lat - prev.lat) * 0.04,
        lng: prev.lng + (CUSTOMER_POS.lng - prev.lng) * 0.04,
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [data.status]);

  const driverName = data.driver?.name ?? 'Жолооч';

  return (
    <>
      {/* Desktop: side-by-side */}
      <div className="hidden lg:flex min-h-screen bg-dark">
        {/* Panel — 40% */}
        <div className="w-96 shrink-0 flex flex-col bg-card border-r border-[var(--glass-border)] h-screen sticky top-0 overflow-hidden">
          <StatusPanel
            orderId={orderId}
            data={data}
            sheetOpen={sheetOpen}
            onToggleSheet={() => setSheetOpen((o) => !o)}
          />
        </div>
        {/* Map — 60% */}
        <div className="flex-1 relative">
          <DeliveryMap driverLat={driverPos.lat} driverLng={driverPos.lng} status={data.status} />
          {/* ETA overlay */}
          {data.estimatedArrivalMinutes != null && data.status === 'IN_PROGRESS' && (
            <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-md border border-[var(--glass-border)] rounded-xl px-4 py-2 shadow-xl">
              <p className="text-xs text-foreground-muted">ETA</p>
              <p className="text-lg font-black text-brand font-mono">~{data.estimatedArrivalMinutes} мин</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: map top 60% + draggable bottom sheet */}
      <div className="lg:hidden flex flex-col min-h-screen bg-dark relative">
        {/* Map — 60vh */}
        <div className="h-[60vh] relative shrink-0">
          <DeliveryMap driverLat={driverPos.lat} driverLng={driverPos.lng} status={data.status} />
          {/* Back button */}
          <Link
            href="/account/orders"
            className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-card/90 backdrop-blur-md border border-[var(--glass-border)] flex items-center justify-center text-foreground-muted hover:text-foreground shadow"
          >
            <ArrowLeft size={16} />
          </Link>
          {data.estimatedArrivalMinutes != null && data.status === 'IN_PROGRESS' && (
            <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-md border border-[var(--glass-border)] rounded-xl px-3 py-1.5 shadow">
              <p className="text-[10px] text-foreground-muted">ETA</p>
              <p className="text-sm font-black text-brand font-mono">~{data.estimatedArrivalMinutes} мин</p>
            </div>
          )}
        </div>

        {/* Bottom panel — 40vh, draggable */}
        <m.div
          className="bg-card border-t border-[var(--glass-border)] flex flex-col overflow-hidden"
          animate={{ height: sheetOpen ? '40vh' : '72px' }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        >
          {/* Drag handle */}
          <button
            onClick={() => setSheetOpen((o) => !o)}
            className="flex items-center justify-center py-3 shrink-0"
          >
            <div className="w-10 h-1 rounded-full bg-foreground-muted/30" />
          </button>
          {/* ETA compact */}
          {!sheetOpen && (
            <div className="flex items-center justify-between px-4 pb-3">
              <div>
                <p className="text-xs text-foreground-muted">Захиалга #{orderId.slice(0, 12)}</p>
                <p className="text-sm font-bold text-foreground">
                  {data.status === 'COMPLETED' ? 'Хүргэгдлээ ✓' :
                   data.status === 'SEARCHING' ? 'Жолооч хайж байна...' :
                   `~${data.estimatedArrivalMinutes ?? '?'} мин`}
                </p>
              </div>
              {data.driver && (
                <a href={`tel:${data.driver.phone}`}
                  className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center text-success">
                  <Phone size={15} />
                </a>
              )}
            </div>
          )}
          {sheetOpen && (
            <div className="flex-1 overflow-y-auto">
              <StatusPanel
                orderId={orderId}
                data={data}
                sheetOpen={sheetOpen}
                onToggleSheet={() => setSheetOpen((o) => !o)}
              />
            </div>
          )}
        </m.div>
      </div>

      {/* Rating modal */}
      <AnimatePresence>
        {showRating && (
          <RatingModal driverName={driverName} onClose={() => setShowRating(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
