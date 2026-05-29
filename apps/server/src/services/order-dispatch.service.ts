import { haversineDistance } from './delivery-fee.service';
import { emitToDriver, emitToOrder, getOnlineDrivers } from '../plugins/realtime.plugin';
import {
  sendDriverNewOrderNotification,
  sendCustomerDriverAssignedNotification,
  sendCustomerStatusNotification,
} from './notification.service';

export interface OnlineDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  rating: number;
  lat: number;
  lng: number;
}

export interface DispatchResult {
  status: 'SEARCHING' | 'OFFERED' | 'ACCEPTED' | 'TIMEOUT';
  driver?: OnlineDriver;
  orderNumber?: string;
  offeredAt?: Date;
  acceptedAt?: Date;
}

const SEARCH_RADIUS_KM_FIRST = 5;
const SEARCH_RADIUS_KM_EXPAND = 10;
const OFFER_TIMEOUT_MS = 30_000;
const MOCK_ACCEPT_DELAY_MS = 5_000;

// In-memory dispatch state for mock (real impl uses DB)
const dispatchState = new Map<string, DispatchResult>();

// FIX 4 — Order number counter (resets on restart; real impl uses DB sequence)
let orderCounter = 1000;

export function generateOrderNumber(): string {
  orderCounter += 1;
  const year = new Date().getFullYear();
  return `DIY-${year}-${String(orderCounter).padStart(5, '0')}`;
}

// Mock online drivers around UB — IDs match fresh SQLite auto-increment (1,2,3)
const MOCK_DRIVERS: OnlineDriver[] = [
  { id: '1', firstName: 'Нарантуяа', lastName: 'Болд', phone: '88112233', vehicleType: 'MOTORCYCLE', vehiclePlate: '1234-УБА', rating: 4.9, lat: 47.9185, lng: 106.9170 },
  { id: '2', firstName: 'Ганболд', lastName: 'Мөнхбат', phone: '88224466', vehicleType: 'CAR', vehiclePlate: '5678-УВА', rating: 4.7, lat: 47.9200, lng: 106.9300 },
  { id: '3', firstName: 'Мөнхцэцэг', lastName: 'Дорж', phone: '88336699', vehicleType: 'VAN', vehiclePlate: '9012-УВА', rating: 4.8, lat: 47.9150, lng: 106.9050 },
];

function findNearestDrivers(lat: number, lng: number, radiusKm: number): OnlineDriver[] {
  // Prefer actually-connected drivers (clicked "Онлайн болох" in browser)
  const online = getOnlineDrivers();
  if (online.size > 0) {
    const realOnline: OnlineDriver[] = [];
    for (const [driverId, info] of online) {
      // Try to enrich with MOCK_DRIVERS data; fall back to minimal info
      const mock = MOCK_DRIVERS.find((d) => d.id === driverId);
      realOnline.push(mock
        ? { ...mock, lat: info.lat, lng: info.lng }
        : { id: driverId, firstName: 'Жолооч', lastName: '', phone: '', vehicleType: 'CAR', vehiclePlate: '', rating: 5, lat: info.lat, lng: info.lng },
      );
    }
    const inRadius = realOnline
      .map((d) => ({ driver: d, dist: haversineDistance(lat, lng, d.lat, d.lng) }))
      .filter(({ dist }) => dist <= radiusKm)
      .sort((a, b) => a.dist - b.dist)
      .map(({ driver }) => driver);

    // If any real online driver is in range, use them
    if (inRadius.length > 0) return inRadius;
    // If online drivers exist but out of range, still pick closest online driver
    const closest = realOnline
      .map((d) => ({ driver: d, dist: haversineDistance(lat, lng, d.lat, d.lng) }))
      .sort((a, b) => a.dist - b.dist);
    if (closest.length > 0) return [closest[0].driver];
  }

  // Fallback to MOCK_DRIVERS when no real drivers are online
  return MOCK_DRIVERS
    .map((d) => ({ driver: d, dist: haversineDistance(lat, lng, d.lat, d.lng) }))
    .filter(({ dist }) => dist <= radiusKm)
    .sort((a, b) => a.dist - b.dist)
    .map(({ driver }) => driver);
}

export interface DispatchPickupStop {
  supplierId: string;
  name: string;
  address: string;
  phone?: string;
  items?: Array<{ name: string; qty: number }>;
}

export interface DispatchCustomerInfo {
  name: string;
  phone: string;
  address: string;
  district: string;
  khoroo?: string;
}

export async function dispatchOrder(
  orderId: string,
  pickupLat: number,
  pickupLng: number,
  customerId?: string,
  pickupStops?: DispatchPickupStop[],
  customer?: DispatchCustomerInfo,
  orderNumber?: string,
): Promise<DispatchResult> {
  const resolvedOrderNumber = orderNumber ?? generateOrderNumber();
  dispatchState.set(orderId, { status: 'SEARCHING', orderNumber: resolvedOrderNumber });

  // Find nearest drivers within 5km, expand to 10km if none
  let candidates = findNearestDrivers(pickupLat, pickupLng, SEARCH_RADIUS_KM_FIRST);
  if (candidates.length === 0) {
    candidates = findNearestDrivers(pickupLat, pickupLng, SEARCH_RADIUS_KM_EXPAND);
  }

  if (candidates.length === 0) {
    const result: DispatchResult = { status: 'TIMEOUT', orderNumber: resolvedOrderNumber };
    dispatchState.set(orderId, result);
    return result;
  }

  const offered = candidates[0];
  const offeredResult: DispatchResult = { status: 'OFFERED', driver: offered, orderNumber: resolvedOrderNumber, offeredAt: new Date() };
  dispatchState.set(orderId, offeredResult);

  // Notify the chosen driver via WebSocket + FCM
  const deliveryFee = 8500 * 100; // mock fee in cents
  const distance = haversineDistance(pickupLat, pickupLng, offered.lat, offered.lng);

  emitToDriver(offered.id, 'delivery:request', {
    driverId: offered.id,
    orderId,
    orderNumber: resolvedOrderNumber,
    fee: deliveryFee,
    pickupStops: (pickupStops ?? []).map((s) => ({
      supplierId: s.supplierId,
      name: s.name,
      address: s.address,
      phone: s.phone ?? '',
      items: s.items ?? [],
    })),
    dropoff: {
      district: customer?.district ?? 'Улаанбаатар',
      khoroo: customer?.khoroo,
      address: customer?.address ?? '',
      customerName: customer?.name ?? 'Хэрэглэгч',
      customerPhone: customer?.phone ?? '',
    },
    distance: Math.round(distance * 10) / 10,
    estimatedMinutes: Math.round(distance * 3 + 5),
  });

  void sendDriverNewOrderNotification(offered.id, {
    orderId,
    orderNumber: resolvedOrderNumber,
    fee: deliveryFee,
    distance,
    pickupCount: pickupStops?.length ?? 1,
    dropoffDistrict: 'Чингэлтэй',
  });

  // Mock: auto-accept after 5 seconds
  return new Promise((resolve) => {
    const acceptTimer = setTimeout(async () => {
      const accepted: DispatchResult = {
        ...offeredResult,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      };
      dispatchState.set(orderId, accepted);

      // Notify customer
      emitToOrder(orderId, 'order:driver_assigned', {
        orderId,
        orderNumber: resolvedOrderNumber,
        driver: {
          id: offered.id,
          name: `${offered.firstName} ${offered.lastName}`,
          phone: offered.phone,
          vehicleType: offered.vehicleType,
          vehiclePlate: offered.vehiclePlate,
          rating: offered.rating,
        },
        estimatedMinutes: 15,
      });

      if (customerId) {
        void sendCustomerDriverAssignedNotification(customerId, {
          orderNumber: resolvedOrderNumber,
          driverName: `${offered.firstName} ${offered.lastName}`,
          driverPhone: offered.phone,
          estimatedMinutes: 15,
        });
      }

      resolve(accepted);
    }, MOCK_ACCEPT_DELAY_MS);

    // Timeout if no accept in 30s
    setTimeout(() => {
      clearTimeout(acceptTimer);
      if (dispatchState.get(orderId)?.status !== 'ACCEPTED') {
        const timeout: DispatchResult = { status: 'TIMEOUT', orderNumber };
        dispatchState.set(orderId, timeout);

        if (customerId) {
          void sendCustomerStatusNotification(customerId, orderNumber, 'CANCELLED');
        }

        resolve(timeout);
      }
    }, OFFER_TIMEOUT_MS);
  });
}

export function getDispatchStatus(orderId: string): DispatchResult {
  return dispatchState.get(orderId) ?? { status: 'SEARCHING' };
}

export function updateDispatchStatus(orderId: string, status: DispatchResult['status'], customerId?: string) {
  const current = dispatchState.get(orderId);
  if (!current) return;
  dispatchState.set(orderId, { ...current, status });

  emitToOrder(orderId, 'order:status', { orderId, status });

  if (customerId && current.orderNumber) {
    void sendCustomerStatusNotification(customerId, current.orderNumber, status);
  }
}
