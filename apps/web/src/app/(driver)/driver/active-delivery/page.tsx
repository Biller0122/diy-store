'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Navigation, Phone } from 'lucide-react';
import { useDriverStore } from '@/lib/driver-store';

function DeliveryMap({
  driverLat,
  driverLng,
  stops,
}: {
  driverLat: number;
  driverLng: number;
  stops: { lat: number; lng: number; label: string; type: 'pickup' | 'dropoff' }[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
  const driverMarkerRef = useRef<import('leaflet').Marker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current || !mapRef.current) return;
    const container = mapRef.current;
    const initialLat = driverLat;
    const initialLng = driverLng;

    import('leaflet').then((L) => {
      const leafletContainer = container as HTMLDivElement & { _leaflet_id?: number | null };
      if (leafletContainer._leaflet_id) leafletContainer._leaflet_id = null;
      const defaultIconPrototype = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
      delete defaultIconPrototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(leafletContainer, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const driverIcon = L.divIcon({
        html: '<div style="width:42px;height:42px;border-radius:50%;background:#2563eb;border:3px solid white;display:grid;place-items:center;font-size:20px;box-shadow:0 8px 24px rgba(37,99,235,.35)">🚗</div>',
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        className: '',
      });
      driverMarkerRef.current = L.marker([initialLat, initialLng], { icon: driverIcon }).addTo(map);

      stops.forEach((stop, index) => {
        const isDropoff = stop.type === 'dropoff';
        const icon = L.divIcon({
          html: `<div style="width:34px;height:34px;border-radius:50%;background:${isDropoff ? '#22c55e' : '#f97316'};border:2px solid white;display:grid;place-items:center;color:white;font-weight:800;box-shadow:0 8px 20px rgba(0,0,0,.35)">${isDropoff ? '🏠' : index + 1}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          className: '',
        });
        L.marker([stop.lat, stop.lng], { icon }).addTo(map).bindPopup(stop.label);
      });

      L.polyline([[initialLat, initialLng], ...stops.map((stop) => [stop.lat, stop.lng] as [number, number])], {
        color: '#ff4500',
        weight: 4,
        opacity: 0.85,
        dashArray: '8 8',
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    driverMarkerRef.current?.setLatLng([driverLat, driverLng]);
  }, [driverLat, driverLng]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={mapRef}
        className="relative z-0 h-full w-full [&_.leaflet-control-container]:!z-10 [&_.leaflet-pane]:!z-0 [&_.leaflet-top]:!z-10"
      />
    </>
  );
}

export default function ActiveDeliveryPage() {
  const { activeDelivery, setActiveDelivery } = useDriverStore();
  const delivery = activeDelivery;
  const [driverPos, setDriverPos] = useState({ lat: 47.932, lng: 106.905 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDriverPos((position) => ({
        lat: position.lat + (47.9205 - position.lat) * 0.08,
        lng: position.lng + (106.929 - position.lng) * 0.08,
      }));
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);

  if (!delivery) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-black text-foreground">Идэвхтэй хүргэлт байхгүй</h1>
        <p className="mt-2 text-sm text-foreground-muted">Бодит захиалга ирэх үед энэ хэсэг автоматаар идэвхжинэ.</p>
        <Link href="/driver/dashboard" className="mt-6 rounded-2xl bg-brand px-5 py-3 text-sm font-black text-white">
          Самбар руу буцах
        </Link>
      </div>
    );
  }

  const stops = [
    ...delivery.pickupStops.map((stop) => ({
      lat: stop.lat,
      lng: stop.lng,
      label: stop.supplierName,
      type: 'pickup' as const,
    })),
    { lat: delivery.dropoffLat, lng: delivery.dropoffLng, label: 'Хэрэглэгч', type: 'dropoff' as const },
  ];
  const instructions = [
    `📍 ${delivery.pickupStops[0]?.supplierName} руу явна уу`,
    'Дэлгүүрт ирлээ, бараагаа шалгана уу',
    delivery.pickupStops.length > 1 ? `📍 ${delivery.pickupStops[1]?.supplierName} руу явна уу` : 'Бараагаа авлаа',
    'Хүргэж байна',
    'Хэрэглэгч дээр ирлээ',
  ];
  const buttonLabels = ['Дэлгүүрт ирлээ', 'Бараа авлаа', 'Бараа авлаа', 'Хүргэж байна', 'Хүргэлт дууслаа'];

  function nextStep() {
    if (step >= buttonLabels.length - 1) {
      setActiveDelivery(null);
      return;
    }
    setStep((current) => current + 1);
  }

  return (
    <div className="relative isolate -m-4 h-[calc(100vh-3.5rem)] overflow-hidden md:-m-6">
      <div className="absolute inset-0 z-0">
        <DeliveryMap driverLat={driverPos.lat} driverLng={driverPos.lng} stops={stops} />
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1000] px-3 pb-3 md:left-60">
        <div className="pointer-events-auto mx-auto max-w-3xl rounded-t-[2rem] border border-white/10 bg-[#111315]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl md:rounded-[2rem]">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">Одоогийн заавар</p>
              {delivery.orderNumber && (
                <span className="font-mono text-xs text-foreground-muted">{delivery.orderNumber}</span>
              )}
            </div>
            <h2 className="mt-1 text-lg font-black text-foreground">{instructions[step] ?? 'Хүргэлт хийж байна'}</h2>
            <p className="mt-1 text-sm text-foreground-muted">Зай: {delivery.distance} км · Тооцоолсон хугацаа: ~{delivery.estimatedDuration} минут</p>
          </div>

          <div className="mb-4 space-y-2">
            {delivery.pickupStops.map((stop, index) => (
              <div key={stop.supplierId} className="rounded-xl bg-white/[0.04] px-3 py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${step > index * 2 ? 'bg-success text-white' : 'bg-white/10 text-foreground-muted'}`}>
                      {step > index * 2 ? '✓' : index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{stop.supplierName}</p>
                      <p className="text-[11px] text-foreground-muted truncate">{stop.address}</p>
                    </div>
                  </div>
                  {stop.phone && (
                    <a href={`tel:${stop.phone}`} className="shrink-0 grid h-8 w-8 place-items-center rounded-xl bg-success/15 text-success">
                      <Phone size={14} />
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
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${step >= 4 ? 'bg-success text-white' : 'bg-white/10 text-foreground-muted'}`}>
                {step >= 4 ? '✓' : '🏠'}
              </span>
              <p className="text-xs text-foreground">{delivery.dropoffAddress}</p>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{delivery.customerName}</p>
                <p className="text-xs text-foreground-muted">{delivery.dropoffAddress}</p>
              </div>
              <a href={`tel:${delivery.customerPhone}`} className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success">
                <Phone size={17} />
              </a>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={nextStep}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-sm font-black text-white shadow-lg shadow-brand/20"
            >
              {step >= buttonLabels.length - 1 ? <CheckCircle2 size={17} /> : <Navigation size={17} />}
              {buttonLabels[step] ?? 'Дараагийн алхам'}
            </button>
            <Link href="/driver/dashboard" className="rounded-2xl border border-white/10 px-4 py-4 text-sm font-bold text-foreground-muted">
              Буцах
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
