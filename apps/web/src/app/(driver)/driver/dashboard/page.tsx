'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Navigation, Star, Wallet } from 'lucide-react';
import DeliveryRequestPopup from '@/components/driver/DeliveryRequestPopup';
import { useDriverStore, VEHICLE_LABEL, type ActiveDelivery } from '@/lib/driver-store';

const RECENT_DELIVERIES: { id: string; address: string; amount: number; time: string }[] = [];

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3002';

export default function DriverDashboardPage() {
  const { driver, isOnline, activeDelivery, setOnlineStatus, setActiveDelivery } = useDriverStore();
  const [showRequest, setShowRequest] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<ActiveDelivery | undefined>(undefined);

  const socketRef = useRef<import('socket.io-client').Socket | null>(null);
  // Refs to avoid stale closures inside socket event handlers
  const isOnlineRef = useRef(isOnline);
  const activeDeliveryRef = useRef(activeDelivery);
  const driverIdRef = useRef(driver?.id);
  const fallbackShownRef = useRef(false);

  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);
  useEffect(() => { activeDeliveryRef.current = activeDelivery; }, [activeDelivery]);
  useEffect(() => { driverIdRef.current = driver?.id; }, [driver?.id]);

  // Connect socket once on mount — persist through online/offline toggles
  useEffect(() => {
    let isMounted = true;

    async function connect() {
      const { io } = await import('socket.io-client');
      const socket = io(SOCKET_URL, {
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
        if (driverId && isOnlineRef.current) {
          socket.emit('driver:join', driverId);
          socket.emit('driver:online', driverId);
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
        pickupStops: Array<{ supplierId: string; name: string; district: string }>;
        dropoff: { district: string; khoroo?: string };
      }) => {
        // Always use refs for current values — never the closed-over ones
        if (!isOnlineRef.current || activeDeliveryRef.current) return;

        console.log('[socket] delivery:request received', payload.orderNumber);

        const request: ActiveDelivery = {
          id: `req-${payload.orderId}`,
          orderId: payload.orderId,
          orderNumber: payload.orderNumber,
          customerName: 'Хэрэглэгч',
          customerPhone: '',
          dropoffAddress: `${payload.dropoff.district}${payload.dropoff.khoroo ? ', ' + payload.dropoff.khoroo : ''}`,
          dropoffLat: 47.9268,
          dropoffLng: 106.9145,
          distance: 4.2,
          estimatedDuration: 25,
          fee: payload.fee,
          status: 'REQUESTED',
          pickupStops: payload.pickupStops.map((s) => ({
            supplierId: s.supplierId,
            supplierName: s.name,
            address: s.district,
            lat: 47.92,
            lng: 106.93,
            status: 'PENDING' as const,
          })),
        };

        fallbackShownRef.current = true; // suppress mock fallback
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
      socket.emit('driver:online', driver.id);
    } else {
      socket.emit('driver:offline', driver.id);
    }
  }, [isOnline, driver?.id]);

  // Dev fallback: show mock popup if no real request arrives within 10s of going online
  useEffect(() => {
    if (!isOnline || activeDelivery || fallbackShownRef.current) return;
    const timer = window.setTimeout(() => {
      if (!showRequest && !activeDelivery && !fallbackShownRef.current) {
        fallbackShownRef.current = true;
        setPendingRequest(undefined); // use MOCK_DELIVERY_REQUEST inside popup
        setShowRequest(true);
      }
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [isOnline, activeDelivery, showRequest]);

  const rejectRequest = useCallback(() => {
    setShowRequest(false);
    setPendingRequest(undefined);
    fallbackShownRef.current = false; // allow another fallback after rejection
  }, []);

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
        onAccept={(delivery) => {
          setActiveDelivery(delivery);
          setShowRequest(false);
          setPendingRequest(undefined);
        }}
      />
    </div>
  );
}
