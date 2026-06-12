'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Navigation, Phone } from 'lucide-react';
import { getDriverAuthToken, useDriverStore } from '@/lib/driver-store';

const SHOP_API = process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? '/shop-api';

const REFRESH_DRIVER_TOKEN_GQL = `
  mutation RefreshDriverToken($id: ID!, $phone: String!) {
    refreshDriverToken(id: $id, phone: $phone) {
      success
      message
      driverId
      token
    }
  }
`;

const UPDATE_DELIVERY_STATUS_GQL = `
  mutation UpdateDeliveryStatus($deliveryId: ID!, $status: String!) {
    updateDeliveryStatus(deliveryId: $deliveryId, status: $status) {
      id
      status
    }
  }
`;

const UPDATE_DELIVERY_PICKUP_STOP_GQL = `
  mutation UpdateDeliveryPickupStop($deliveryId: ID!, $supplierId: String!, $status: String!) {
    updateDeliveryPickupStop(deliveryId: $deliveryId, supplierId: $supplierId, status: $status) {
      id
      pickupStops {
        supplierId
        status
      }
    }
  }
`;

const COMPLETE_DELIVERY_WITH_CODE_GQL = `
  mutation CompleteDeliveryWithCode($deliveryId: ID!, $driverId: String!, $code: String!) {
    completeDeliveryWithCode(deliveryId: $deliveryId, driverId: $driverId, code: $code) {
      id
      status
    }
  }
`;

const ACTIVE_DELIVERIES_GQL = `
  query ActiveDeliveriesForDriver($driverId: String!) {
    activeDeliveriesForDriver(driverId: $driverId) {
      id
      orderId
      orderNumber
      customerName
      customerPhone
      dropoffAddress
      dropoffLat
      dropoffLng
      pickupStops {
        supplierId
        supplierName
        address
        phone
        lat
        lng
        status
      }
      orderItems {
        supplierId
        name
        qty
      }
      distance
      estimatedDuration
      proposedFee
      status
    }
  }
`;

async function refreshDriverToken(driverId: string, phone: string): Promise<string> {
  const response = await fetch(SHOP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query: REFRESH_DRIVER_TOKEN_GQL, variables: { id: driverId, phone } }),
  });
  if (!response.ok) throw new Error(`Driver API ${response.status}`);
  const json = await response.json() as {
    data?: { refreshDriverToken: { success: boolean; message: string; token?: string | null } };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  const result = json.data?.refreshDriverToken;
  if (!result?.success || !result.token) throw new Error(result?.message ?? 'Дахин нэвтрэх шаардлагатай');
  return result.token;
}

async function updateDeliveryStatus(deliveryId: string, status: string, token: string | null) {
  const response = await fetch(SHOP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ query: UPDATE_DELIVERY_STATUS_GQL, variables: { deliveryId, status } }),
  });
  if (!response.ok) throw new Error(`Driver API ${response.status}`);
  const json = await response.json() as { errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
}

async function updateDeliveryPickupStop(deliveryId: string, supplierId: string, status: 'ARRIVED' | 'PICKED_UP', token: string | null) {
  const response = await fetch(SHOP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ query: UPDATE_DELIVERY_PICKUP_STOP_GQL, variables: { deliveryId, supplierId, status } }),
  });
  if (!response.ok) throw new Error(`Driver API ${response.status}`);
  const json = await response.json() as { errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
}

async function completeDeliveryWithCode(deliveryId: string, driverId: string, code: string, token: string | null) {
  const response = await fetch(SHOP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({
      query: COMPLETE_DELIVERY_WITH_CODE_GQL,
      variables: { deliveryId, driverId, code },
    }),
  });
  if (!response.ok) throw new Error(`Driver API ${response.status}`);
  const json = await response.json() as { errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
}

type ActiveDeliveryResponse = {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  pickupStops: Array<{
    supplierId: string;
    supplierName: string;
    address: string;
    phone?: string | null;
    lat: number;
    lng: number;
    status: 'PENDING' | 'ARRIVED' | 'PICKED_UP';
  }>;
  orderItems: Array<{ supplierId: string; name: string; qty: number }>;
  distance: number;
  estimatedDuration: number;
  proposedFee: number;
  status: string;
};

type DeliveryStep = {
  instruction: string;
  label: string;
  supplierId?: string;
  pickupStatus?: 'ARRIVED' | 'PICKED_UP';
  deliveryStatus?: string;
  complete?: boolean;
};

async function fetchActiveDelivery(driverId: string, token: string | null) {
  const response = await fetch(SHOP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ query: ACTIVE_DELIVERIES_GQL, variables: { driverId } }),
  });
  if (!response.ok) throw new Error(`Driver API ${response.status}`);
  const json = await response.json() as {
    data?: { activeDeliveriesForDriver: ActiveDeliveryResponse[] };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  const delivery = json.data?.activeDeliveriesForDriver?.[0];
  if (!delivery) return null;
  return {
    id: delivery.id,
    orderId: delivery.orderId,
    orderNumber: delivery.orderNumber,
    customerName: delivery.customerName || 'Хэрэглэгч',
    customerPhone: delivery.customerPhone || '',
    dropoffAddress: delivery.dropoffAddress,
    dropoffLat: delivery.dropoffLat,
    dropoffLng: delivery.dropoffLng,
    pickupStops: delivery.pickupStops.map((stop) => ({
      supplierId: stop.supplierId,
      supplierName: stop.supplierName,
      address: stop.address,
      phone: stop.phone ?? '',
      lat: stop.lat,
      lng: stop.lng,
      status: stop.status,
      items: delivery.orderItems
        .filter((item) => item.supplierId === stop.supplierId)
        .map((item) => ({ name: item.name, qty: item.qty })),
    })),
    distance: delivery.distance,
    estimatedDuration: delivery.estimatedDuration,
    fee: delivery.proposedFee,
    status: delivery.status,
  };
}

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
  const { activeDelivery, authToken, driver, setActiveDelivery, setAuthToken } = useDriverStore();
  const delivery = activeDelivery;
  const [driverPos, setDriverPos] = useState({ lat: 47.932, lng: 106.905 });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [deliveryCode, setDeliveryCode] = useState('');

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDriverPos((position) => ({
        lat: position.lat + (47.9205 - position.lat) * 0.08,
        lng: position.lng + (106.929 - position.lng) * 0.08,
      }));
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!driver) return;
    const driverId = driver.id;
    let mounted = true;
    async function loadCurrentDelivery() {
      const token = await getToken();
      try {
        const current = await fetchActiveDelivery(driverId, token);
        if (!mounted) return;
        if (current) {
          setActiveDelivery(current);
          setError('');
        } else if (activeDelivery) {
          setActiveDelivery(null);
          setError('Энэ хүргэлт DB дээр олдсонгүй. Самбар руу буцаад шинэ захиалга авна уу.');
        }
      } catch {
        // Keep local delivery if the network briefly fails.
      }
    }
    void loadCurrentDelivery();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]);

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
  const deliverySteps: DeliveryStep[] = [
    ...delivery.pickupStops.flatMap((stop) => [
      {
        instruction: `📍 ${stop.supplierName} руу явна уу`,
        label: 'Дэлгүүрт ирлээ',
        supplierId: stop.supplierId,
        pickupStatus: 'ARRIVED' as const,
      },
      {
        instruction: `${stop.supplierName} дээр бараагаа шалгана уу`,
        label: 'Бараа авлаа',
        supplierId: stop.supplierId,
        pickupStatus: 'PICKED_UP' as const,
      },
    ]),
    { instruction: 'Хүргэж байна', label: 'Хэрэглэгч рүү явж байна', deliveryStatus: 'IN_PROGRESS' },
    { instruction: 'Хэрэглэгч дээр ирлээ', label: 'Хүргэлт дууслаа', complete: true },
  ];

  async function getToken(): Promise<string | null> {
    let token = authToken || getDriverAuthToken();
    if (!token && driver) {
      try {
        token = await refreshDriverToken(driver.id, driver.phone);
        setAuthToken(token);
      } catch {
        // proceed without token — server will return auth error
      }
    }
    return token;
  }

  async function nextStep() {
    if (!delivery || saving) return;
    setSaving(true);
    setError('');
    const token = await getToken();
    const currentStep = deliverySteps[step] ?? deliverySteps[deliverySteps.length - 1];
    if (currentStep?.complete) {
      setShowCodeModal(true);
      setSaving(false);
      return;
    }
    try {
      const pickupStatus = currentStep?.pickupStatus;
      if (pickupStatus && currentStep.supplierId) {
        await updateDeliveryStatus(delivery.id, 'IN_PROGRESS', token);
        await updateDeliveryPickupStop(delivery.id, currentStep.supplierId, pickupStatus, token);
        setActiveDelivery({
          ...delivery,
          status: 'IN_PROGRESS',
          pickupStops: delivery.pickupStops.map((stop) =>
            stop.supplierId === currentStep.supplierId ? { ...stop, status: pickupStatus } : stop,
          ),
        });
      } else if (currentStep?.deliveryStatus) {
        await updateDeliveryStatus(delivery.id, currentStep.deliveryStatus, token);
        setActiveDelivery({ ...delivery, status: currentStep.deliveryStatus });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Хүргэлтийн төлөв шинэчлэхэд алдаа гарлаа');
      setSaving(false);
      return;
    }
    setStep((current) => current + 1);
    setSaving(false);
  }

  async function finishWithCode() {
    if (!delivery || !driver || saving) return;
    const normalizedCode = deliveryCode.replace(/\D/g, '');
    if (normalizedCode.length !== 6) {
      setError('6 оронтой буулгах код оруулна уу');
      return;
    }
    setSaving(true);
    setError('');
    const token = await getToken();
    try {
      await completeDeliveryWithCode(delivery.id, driver.id, normalizedCode, token);
      setShowCodeModal(false);
      setDeliveryCode('');
      setActiveDelivery(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Буулгах код шалгахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
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
            <h2 className="mt-1 text-lg font-black text-foreground">{deliverySteps[step]?.instruction ?? 'Хүргэлт хийж байна'}</h2>
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
            {error && <p className="absolute -top-8 left-4 right-4 text-center text-xs font-semibold text-error">{error}</p>}
            <button
              onClick={() => void nextStep()}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-sm font-black text-white shadow-lg shadow-brand/20 disabled:opacity-60"
            >
              {deliverySteps[step]?.complete ? <CheckCircle2 size={17} /> : <Navigation size={17} />}
              {saving ? 'Хадгалж байна...' : deliverySteps[step]?.label ?? 'Дараагийн алхам'}
            </button>
            <Link href="/driver/dashboard" className="rounded-2xl border border-white/10 px-4 py-4 text-sm font-bold text-foreground-muted">
              Буцах
            </Link>
          </div>
        </div>
      </div>

      {showCodeModal && (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/70 px-4 pb-4 sm:items-center sm:pb-0">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-card p-5 shadow-2xl">
            <h3 className="text-lg font-black text-foreground">Буулгах код оруулах</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Хэрэглэгчээс 6 оронтой код аваад оруулснаар хүргэлт бүрэн дуусна.
            </p>
            <input
              value={deliveryCode}
              onChange={(event) => setDeliveryCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="000000"
              className="mt-4 w-full rounded-2xl border border-[var(--glass-border)] bg-surface px-4 py-4 text-center font-mono text-2xl font-black tracking-[0.3em] text-foreground outline-none focus:ring-2 focus:ring-brand"
            />
            {error && <p className="mt-3 text-sm text-error">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setShowCodeModal(false); setDeliveryCode(''); setError(''); }}
                className="flex-1 rounded-2xl border border-[var(--glass-border)] py-3 text-sm font-bold text-foreground-muted"
              >
                Болих
              </button>
              <button
                onClick={() => void finishWithCode()}
                disabled={saving}
                className="flex-1 rounded-2xl bg-brand py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {saving ? 'Шалгаж байна...' : 'Дуусгах'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
