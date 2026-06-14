'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Navigation, Star, Wallet } from 'lucide-react';
import DeliveryRequestPopup from '@/components/driver/DeliveryRequestPopup';
import { getDriverAuthToken, useDriverStore, VEHICLE_LABEL, type ActiveDelivery, type DriverUser } from '@/lib/driver-store';

const RECENT_DELIVERIES: { id: string; address: string; amount: number; time: string }[] = [];

const CONFIGURED_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
const SHOP_API = process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? '/shop-api';

const SET_ONLINE_STATUS_GQL = `
  mutation SetOnlineStatus($id: ID!, $isOnline: Boolean!) {
    setOnlineStatus(id: $id, isOnline: $isOnline) {
      id
      isOnline
    }
  }
`;

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

const ACCEPT_DELIVERY_GQL = `
  mutation AcceptDelivery($deliveryId: ID!, $driverId: String!) {
    acceptDelivery(deliveryId: $deliveryId, driverId: $driverId) {
      id
      orderId
      orderNumber
      status
      driverId
    }
  }
`;

const AVAILABLE_DELIVERIES_GQL = `
  query AvailableDeliveries {
    availableDeliveries {
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
      finalFee
      status
      createdAt
    }
  }
`;

type AvailableDeliveryResponse = {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
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
  finalFee: number;
  status: string;
  createdAt: string;
};

async function refreshDriverToken(driverId: string, phone: string) {
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

async function updateDriverOnlineStatus(driverId: string, isOnline: boolean, token: string | null) {
  const response = await fetch(SHOP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ query: SET_ONLINE_STATUS_GQL, variables: { id: driverId, isOnline } }),
  });
  if (!response.ok) throw new Error(`Driver API ${response.status}`);
  const json = await response.json() as { errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
}

async function acceptDeliveryRequest(deliveryId: string, driverId: string, token: string | null) {
  const response = await fetch(SHOP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ query: ACCEPT_DELIVERY_GQL, variables: { deliveryId, driverId } }),
  });
  if (!response.ok) throw new Error(`Driver API ${response.status}`);
  const json = await response.json() as { errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
}

async function fetchAvailableDeliveries() {
  const response = await fetch(SHOP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query: AVAILABLE_DELIVERIES_GQL }),
  });
  if (!response.ok) throw new Error(`Driver API ${response.status}`);
  const json = await response.json() as {
    data?: { availableDeliveries: AvailableDeliveryResponse[] };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data?.availableDeliveries ?? [];
}

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

function toDriverOnlinePayload(driver: DriverUser) {
  return {
    driverId: driver.id,
    firstName: driver.firstName,
    lastName: driver.lastName,
    phone: driver.phone,
    vehicleType: driver.vehicleType,
    vehiclePlate: driver.vehiclePlate,
    rating: driver.rating,
    lat: 47.9185,
    lng: 106.917,
  };
}

function toActiveDelivery(delivery: AvailableDeliveryResponse): ActiveDelivery {
  return {
    id: delivery.id,
    orderId: delivery.orderId,
    orderNumber: delivery.orderNumber,
    customerName: delivery.customerName || 'Хэрэглэгч',
    customerPhone: delivery.customerPhone || '',
    dropoffAddress: delivery.dropoffAddress,
    dropoffLat: delivery.dropoffLat,
    dropoffLng: delivery.dropoffLng,
    distance: delivery.distance || 0,
    estimatedDuration: delivery.estimatedDuration || 25,
    fee: delivery.proposedFee || delivery.finalFee || 0,
    status: 'REQUESTED',
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
  };
}

export default function DriverDashboardPage() {
  const { driver, authToken, isOnline, activeDelivery, setAuthToken, setOnlineStatus, setActiveDelivery } = useDriverStore();
  const [showRequest, setShowRequest] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<ActiveDelivery | undefined>(undefined);
  const [onlineError, setOnlineError] = useState('');
  const [onlineSaving, setOnlineSaving] = useState(false);

  const socketRef = useRef<import('socket.io-client').Socket | null>(null);
  // Refs to avoid stale closures inside socket event handlers
  const isOnlineRef = useRef(isOnline);
  const activeDeliveryRef = useRef(activeDelivery);
  const driverIdRef = useRef(driver?.id);
  const dismissedRequestIdsRef = useRef(new Set<string>());

  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);
  useEffect(() => { activeDeliveryRef.current = activeDelivery; }, [activeDelivery]);
  useEffect(() => { driverIdRef.current = driver?.id; }, [driver?.id]);

  // Connect socket once on mount — persist through online/offline toggles
  useEffect(() => {
    let isMounted = true;

    async function connect() {
      const { io } = await import('socket.io-client');
      const currentDriver = useDriverStore.getState().driver;
      let token = useDriverStore.getState().authToken || getDriverAuthToken();
      if (!token && currentDriver) {
        try {
          token = await refreshDriverToken(currentDriver.id, currentDriver.phone);
          setAuthToken(token);
        } catch (err) {
          console.warn('[socket] driver token refresh failed:', err instanceof Error ? err.message : err);
        }
      }
      const socket = io(getSocketUrl(), {
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });
      if (!isMounted) { socket.disconnect(); return; }
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[socket] connected', socket.id);
        // Re-join driver room after reconnect
        const driverId = driverIdRef.current;
        const currentDriver = useDriverStore.getState().driver;
        if (driverId && currentDriver && isOnlineRef.current) {
          socket.emit('driver:join', driverId);
          socket.emit('driver:online', toDriverOnlinePayload(currentDriver));
        }
      });

      socket.on('disconnect', () => {
        console.log('[socket] disconnected');
      });

      socket.on('delivery:request', (payload: {
        driverId: string;
        orderId: string;
        orderNumber: string;
        fee: number;
        pickupStops: Array<{ supplierId: string; name: string; address: string; phone?: string; items?: Array<{ name: string; qty: number }> }>;
        dropoff: { district: string; khoroo?: string; address?: string; customerName?: string; customerPhone?: string };
        distance?: number;
        estimatedMinutes?: number;
      }) => {
        if (!isOnlineRef.current || activeDeliveryRef.current) return;
        if (dismissedRequestIdsRef.current.has(payload.orderId)) return;
        console.log('[socket] delivery:request received', payload.orderNumber);

        const stops = Array.isArray(payload.pickupStops) ? payload.pickupStops : [];
        const dropoff = payload.dropoff ?? { district: 'Улаанбаатар' };
        const request: ActiveDelivery = {
          id: payload.orderId,
          orderId: payload.orderId,
          orderNumber: payload.orderNumber,
          customerName: dropoff.customerName ?? 'Хэрэглэгч',
          customerPhone: dropoff.customerPhone ?? '',
          dropoffAddress: dropoff.address ?? `${dropoff.district}${dropoff.khoroo ? ', ' + dropoff.khoroo : ''}`,
          dropoffLat: 47.9268,
          dropoffLng: 106.9145,
          distance: payload.distance ?? 4.2,
          estimatedDuration: payload.estimatedMinutes ?? 25,
          fee: payload.fee ?? 0,
          status: 'REQUESTED',
          pickupStops: stops.map((s) => ({
            supplierId: s.supplierId ?? '',
            supplierName: s.name ?? '',
            address: s.address ?? '',
            phone: s.phone ?? '',
            items: s.items ?? [],
            lat: 47.92,
            lng: 106.93,
            status: 'PENDING' as const,
          })),
        };

        setPendingRequest(request);
        setShowRequest(true);
      });
    }

    void connect();

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []); // connect once, never reconnect on prop changes

  // Join/leave driver room when online status changes (after socket is established)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !driver) return;

    if (isOnline) {
      socket.emit('driver:join', driver.id);
      socket.emit('driver:online', toDriverOnlinePayload(driver));
    } else {
      socket.emit('driver:offline', driver.id);
    }
  }, [isOnline, driver?.id]);

  // Production fallback: if the public /socket.io route is unavailable, keep
  // checking SEARCHING deliveries through GraphQL so online drivers still get
  // a visible order popup.
  useEffect(() => {
    if (!isOnline || !driver || activeDelivery || showRequest) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const deliveries = await fetchAvailableDeliveries();
        if (cancelled || !isOnlineRef.current || activeDeliveryRef.current || showRequest) return;

        const next = deliveries
          .filter((delivery) => delivery.status === 'SEARCHING')
          .filter((delivery) => !dismissedRequestIdsRef.current.has(delivery.id))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

        if (next) {
          setPendingRequest(toActiveDelivery(next));
          setShowRequest(true);
        }
      } catch (err) {
        console.warn('[driver] available deliveries polling failed:', err instanceof Error ? err.message : err);
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeDelivery, driver, isOnline, showRequest]);


  const rejectRequest = useCallback(() => {
    if (pendingRequest?.id) dismissedRequestIdsRef.current.add(pendingRequest.id);
    setShowRequest(false);
    setPendingRequest(undefined);
  }, [pendingRequest]);

  const acceptRequest = useCallback(async (delivery: ActiveDelivery) => {
    if (!driver) return;
    setOnlineError('');
    try {
      let token = authToken || getDriverAuthToken();
      if (!token) {
        token = await refreshDriverToken(driver.id, driver.phone);
        setAuthToken(token);
      }
      await acceptDeliveryRequest(delivery.id, driver.id, token);
      setActiveDelivery({ ...delivery, status: 'ACCEPTED' });
      setShowRequest(false);
      setPendingRequest(undefined);
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Хүргэлт хүлээн авахад алдаа гарлаа');
    }
  }, [authToken, driver, setActiveDelivery, setAuthToken]);

  const toggleOnline = useCallback(async () => {
    if (!driver || onlineSaving) return;
    const next = !isOnline;
    setOnlineSaving(true);
    setOnlineError('');
    try {
      let token = authToken || getDriverAuthToken();
      if (!token) {
        token = await refreshDriverToken(driver.id, driver.phone);
        setAuthToken(token);
      }
      await updateDriverOnlineStatus(driver.id, next, token);
      setOnlineStatus(next);
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Онлайн төлөв солиход алдаа гарлаа');
    } finally {
      setOnlineSaving(false);
    }
  }, [authToken, driver, isOnline, onlineSaving, setAuthToken, setOnlineStatus]);

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
          {isOnline ? 'Онлайн байна — Захиалга хүлээж байна...' : 'Офлайн байна'}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          {isOnline ? 'Шинэ хүргэлт ирэхэд дэлгэц дээр шууд мэдэгдэнэ.' : 'Захиалга авахын тулд онлайн болно уу'}
        </p>
        <button
          onClick={() => void toggleOnline()}
          disabled={onlineSaving}
          className={`mt-6 rounded-2xl px-8 py-4 text-base font-black text-white transition ${
            isOnline ? 'bg-foreground-muted hover:bg-foreground-muted/80' : 'bg-success shadow-lg shadow-success/20 hover:brightness-110'
          } disabled:opacity-60`}
        >
          {onlineSaving ? 'Хадгалж байна...' : isOnline ? 'Офлайн болох' : 'Онлайн болох'}
        </button>
        {onlineError && <p className="mt-3 text-sm text-error">{onlineError}</p>}
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[
          { icon: Navigation, label: 'Хүргэлт', value: String(driver?.totalDeliveries ?? 7) },
          { icon: Wallet, label: 'Орлого', value: driver ? `₮${Math.round(driver.todayEarnings / 100).toLocaleString()}` : '₮24,500' },
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
              {activeDelivery.orderNumber && (
                <p className="font-mono text-xs text-foreground-muted mt-0.5">{activeDelivery.orderNumber}</p>
              )}
              <h3 className="mt-1 text-lg font-black text-foreground">{activeDelivery.customerName}</h3>
              <p className="mt-1 text-sm text-foreground-muted">{activeDelivery.dropoffAddress}</p>
              <p className="mt-3 text-xs text-foreground-muted">
                {activeDelivery.pickupStops.map((stop) => stop.supplierName).join(', ')} — бараа авах
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
        request={pendingRequest}
        onReject={rejectRequest}
        onAccept={(delivery) => void acceptRequest(delivery)}
      />
    </div>
  );
}
