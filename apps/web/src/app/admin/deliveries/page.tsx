'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation, Package, Phone, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { vendureAdminFetch } from '@/lib/vendure';

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

interface DbDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string | null;
  isOnline: boolean;
  currentLat: number | null;
  currentLng: number | null;
}

interface ActiveDelivery {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  dropoffAddress: string;
  orderItems: { name: string; qty: number; price: number }[];
  driverId: string | null;
  driverLat: number | null;
  driverLng: number | null;
  distance: number;
  estimatedDuration: number;
  proposedFee: number;
  status: string;
}

const GET_ACTIVE_DELIVERIES_GQL = `
  query {
    getActiveDeliveries {
      id
      orderId
      orderNumber
      customerName
      customerPhone
      dropoffAddress
      orderItems { name qty price }
      driverId
      driverLat
      driverLng
      distance
      estimatedDuration
      proposedFee
      status
    }
  }
`;

const GET_ACTIVE_DRIVERS_GQL = `
  query {
    drivers(status: "ACTIVE") {
      id
      firstName
      lastName
      phone
      vehicleType
      vehiclePlate
      isOnline
      currentLat
      currentLng
    }
  }
`;

const CONFIGURED_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

function getSocketUrl() {
  if (typeof window === 'undefined') return CONFIGURED_SOCKET_URL || 'http://localhost:3002';
  const { protocol, hostname, port, origin } = window.location;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && ['18080', '18081', '18082', '18083'].includes(port)) {
    return `${protocol}//${hostname}:13002`;
  }
  if (CONFIGURED_SOCKET_URL && !/^https?:\/\/localhost(?::3002)?\/?$/i.test(CONFIGURED_SOCKET_URL)) {
    return CONFIGURED_SOCKET_URL;
  }
  return origin;
}

function buildDriverList(dbDrivers: DbDriver[], deliveries: ActiveDelivery[]): LiveDriver[] {
  return dbDrivers.map((d) => {
    const activeDelivery = deliveries.find((del) => del.driverId === String(d.id));
    const status: LiveDriver['status'] = activeDelivery ? 'DELIVERING' : d.isOnline ? 'ONLINE' : 'OFFLINE';
    return {
      id: String(d.id),
      name: `${d.firstName} ${d.lastName}`.trim(),
      phone: d.phone,
      vehicleType: d.vehicleType,
      vehiclePlate: d.vehiclePlate ?? '',
      status,
      lat: activeDelivery?.driverLat ?? d.currentLat ?? 47.9185,
      lng: activeDelivery?.driverLng ?? d.currentLng ?? 106.9257,
      currentOrder: activeDelivery?.orderNumber,
      eta: activeDelivery ? Math.round(activeDelivery.estimatedDuration * 0.6) : undefined,
    };
  });
}

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
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [deliveriesResult, driversResult] = await Promise.all([
        vendureAdminFetch<{ getActiveDeliveries: ActiveDelivery[] }>(GET_ACTIVE_DELIVERIES_GQL),
        vendureAdminFetch<{ drivers: DbDriver[] }>(GET_ACTIVE_DRIVERS_GQL),
      ]);
      setDeliveries(deliveriesResult.getActiveDeliveries);
      setDrivers(buildDriverList(driversResult.drivers, deliveriesResult.getActiveDeliveries));
      setLastRefresh(new Date());
    } catch {
      // keep previous state on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    let socket: import('socket.io-client').Socket | null = null;

    import('socket.io-client').then(({ io }) => {
      socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });

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
            d.id === payload.driverId ? { ...d, status: d.currentOrder ? 'DELIVERING' : 'ONLINE' } : d,
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

      socket.on('order:status', () => {
        void loadData();
      });
    });

    return () => {
      socket?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const delivering = drivers.filter((d) => d.status === 'DELIVERING').length;
  const online = drivers.filter((d) => d.status === 'ONLINE').length;
  const offline = drivers.filter((d) => d.status === 'OFFLINE').length;

  return (
    <div className="flex flex-col gap-5 h-full">
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
            {socketConnected ? 'Шууд холболт' : 'Офлайн'}
          </div>
          <button
            onClick={() => { setLoading(true); void loadData(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-[var(--glass-border)] text-sm text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Шинэчлэх
          </button>
        </div>
      </div>

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

      <div className="flex-1 grid lg:grid-cols-[1fr_300px] gap-4 min-h-0">
        <div className="bg-card rounded-2xl border border-[var(--glass-border)] overflow-hidden min-h-[400px]">
          <DriverMap drivers={drivers} />
        </div>

        <div className="bg-card rounded-2xl border border-[var(--glass-border)] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--glass-border)]">
            <p className="text-sm font-semibold text-foreground">Жолоочид ({drivers.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--glass-border)]">
            {loading && drivers.length === 0 && (
              <div className="p-4 text-center text-xs text-foreground-muted">Уншиж байна...</div>
            )}
            {!loading && drivers.length === 0 && (
              <div className="p-4 text-center text-xs text-foreground-muted">Идэвхтэй жолооч байхгүй</div>
            )}
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

      <div className="rounded-2xl border border-[var(--glass-border)] bg-card">
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Идэвхтэй хүргэлтүүд ({deliveries.length})</p>
          <span className="text-xs text-foreground-muted">DB-с шууд татсан</span>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          {deliveries.length === 0 ? (
            <div className="p-4 text-center text-xs text-foreground-muted">Идэвхтэй хүргэлт алга</div>
          ) : deliveries.map((delivery) => (
            <div key={delivery.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-center">
              <div>
                <p className="font-mono font-bold text-brand">{delivery.orderNumber || delivery.orderId}</p>
                <p className="text-xs text-foreground-muted">{delivery.customerName || 'Хэрэглэгч'} · {delivery.customerPhone}</p>
              </div>
              <p className="truncate text-xs text-foreground-muted">{delivery.orderItems.map((item) => `${item.name} × ${item.qty}`).join(', ') || '-'}</p>
              <p className="truncate text-xs text-foreground-muted">{delivery.dropoffAddress}</p>
              <div className="text-right">
                <p className="text-xs font-bold text-foreground">{delivery.status}</p>
                <p className="text-xs text-foreground-muted">{delivery.distance.toFixed(1)} км · ₮{Math.round(delivery.proposedFee / 100).toLocaleString('mn-MN')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
