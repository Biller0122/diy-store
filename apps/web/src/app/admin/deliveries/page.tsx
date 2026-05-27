'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation, Package, Phone, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface LiveDriver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  status: 'DELIVERING' | 'ONLINE' | 'OFFLINE';
  lat: number;
  lng: number;
  currentOrder?: string;
  eta?: number;
}

const INITIAL_DRIVERS: LiveDriver[] = [
  { id: 'd1', name: 'Анхбаяр Дамдин', phone: '8800-1122', vehicleType: 'MOTORCYCLE', vehiclePlate: '2345-УБА', status: 'DELIVERING', lat: 47.920, lng: 106.985, currentOrder: 'DIY-2026-01001', eta: 8 },
  { id: 'd2', name: 'Болд Ганбаяр',   phone: '9911-2233', vehicleType: 'CAR',        vehiclePlate: '3456-УВА', status: 'DELIVERING', lat: 47.908, lng: 106.920, currentOrder: 'DIY-2026-01002', eta: 15 },
  { id: 'd3', name: 'Сарнай Батсүх',  phone: '8822-3344', vehicleType: 'MOTORCYCLE', vehiclePlate: '1234-УБА', status: 'ONLINE',     lat: 47.935, lng: 106.910 },
  { id: 'd4', name: 'Дорж Мөнхбат',   phone: '9933-4455', vehicleType: 'CAR',        vehiclePlate: '5678-УВА', status: 'OFFLINE',    lat: 47.880, lng: 106.870 },
];

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3002';

function DriverMap({ drivers }: { drivers: LiveDriver[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());

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

      const map = L.map(mapRef.current!, { center: [47.9184, 106.9257], zoom: 12, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

      drivers.forEach((d) => {
        const color = d.status === 'DELIVERING' ? '#FF4500' : d.status === 'ONLINE' ? '#22c55e' : '#6b7280';
        const emoji = d.vehicleType === 'MOTORCYCLE' ? '🏍️' : '🚗';
        const icon = L.divIcon({
          html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${emoji}</div>`,
          iconSize: [36, 36], iconAnchor: [18, 18], className: '',
        });
        const marker = L.marker([d.lat, d.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${d.name}</b><br>${d.vehiclePlate}<br>${d.status}${d.currentOrder ? `<br>Захиалга: ${d.currentOrder}` : ''}`);
        markersRef.current.set(d.id, marker);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      (mapInstanceRef.current as { remove?: () => void })?.remove?.();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when driver positions change
  useEffect(() => {
    const L = markersRef.current;
    drivers.forEach((d) => {
      const marker = L.get(d.id) as { setLatLng?: (pos: [number, number]) => void } | undefined;
      marker?.setLatLng?.([d.lat, d.lng]);
    });
  }, [drivers]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
}

const STATUS_COLOR: Record<LiveDriver['status'], string> = {
  DELIVERING: 'bg-brand/15 text-brand border-brand/30',
  ONLINE: 'bg-success/15 text-success border-success/30',
  OFFLINE: 'bg-foreground-muted/10 text-foreground-muted border-foreground-muted/20',
};

const STATUS_LABEL: Record<LiveDriver['status'], string> = {
  DELIVERING: 'Хүргэж байна',
  ONLINE: 'Онлайн',
  OFFLINE: 'Офлайн',
};

export default function AdminDeliveriesPage() {
  const [drivers, setDrivers] = useState<LiveDriver[]>(INITIAL_DRIVERS);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [socketConnected, setSocketConnected] = useState(false);

  // Connect to WebSocket for live driver positions
  useEffect(() => {
    let socket: import('socket.io-client').Socket | null = null;

    import('socket.io-client').then(({ io }) => {
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));

      socket.on('driver:location', (payload: { driverId: string; lat: number; lng: number }) => {
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === payload.driverId
              ? { ...d, lat: payload.lat, lng: payload.lng, status: 'DELIVERING' }
              : d,
          ),
        );
        setLastRefresh(new Date());
      });

      socket.on('driver:online', (payload: { driverId: string }) => {
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === payload.driverId ? { ...d, status: 'ONLINE' } : d,
          ),
        );
      });

      socket.on('driver:offline', (payload: { driverId: string }) => {
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === payload.driverId ? { ...d, status: 'OFFLINE' } : d,
          ),
        );
      });
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  const delivering = drivers.filter((d) => d.status === 'DELIVERING').length;
  const online = drivers.filter((d) => d.status === 'ONLINE').length;
  const offline = drivers.filter((d) => d.status === 'OFFLINE').length;

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Шууд хүргэлтийн газрын зураг</h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Сүүлд шинэчлэгдсэн: {lastRefresh.toLocaleTimeString('mn-MN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl ${
            socketConnected ? 'bg-success/10 text-success' : 'bg-foreground-muted/10 text-foreground-muted'
          }`}>
            {socketConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {socketConnected ? 'Шууд холболт' : 'Туршилтын өгөгдөл'}
          </div>
          <button
            onClick={() => { setDrivers(INITIAL_DRIVERS); setLastRefresh(new Date()); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-[var(--glass-border)] text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            <RefreshCw size={14} /> Шинэчлэх
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Хүргэж байна', value: delivering, color: 'text-brand' },
          { label: 'Онлайн', value: online, color: 'text-success' },
          { label: 'Офлайн', value: offline, color: 'text-foreground-muted' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-[var(--glass-border)] p-3 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-foreground-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Map + list */}
      <div className="flex-1 grid lg:grid-cols-[1fr_300px] gap-4 min-h-0">
        <div className="bg-card rounded-2xl border border-[var(--glass-border)] overflow-hidden min-h-[400px]">
          <DriverMap drivers={drivers} />
        </div>

        <div className="bg-card rounded-2xl border border-[var(--glass-border)] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--glass-border)]">
            <p className="text-sm font-semibold text-foreground">Жолоочид ({drivers.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--glass-border)]">
            {drivers.map((d) => (
              <div key={d.id} className="p-3 hover:bg-surface/50">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                    <p className="text-xs text-foreground-muted">{d.vehiclePlate}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLOR[d.status]}`}>
                    {STATUS_LABEL[d.status]}
                  </span>
                </div>
                {d.currentOrder && (
                  <div className="flex items-center gap-1.5 text-xs text-foreground-muted mb-1">
                    <Package size={11} />
                    <span className="font-mono">{d.currentOrder}</span>
                    {d.eta && <span className="ml-auto text-brand font-semibold">~{d.eta} мин</span>}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Navigation size={11} />
                  <span>{d.vehicleType === 'MOTORCYCLE' ? 'Мотоцикл' : 'Машин'}</span>
                  <a href={`tel:${d.phone}`} className="ml-auto flex items-center gap-1 text-success hover:underline">
                    <Phone size={11} /> {d.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
