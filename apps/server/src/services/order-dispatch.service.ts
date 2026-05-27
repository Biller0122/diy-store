import { haversineDistance } from './delivery-fee.service';
import { emitToDriver, emitToOrder } from '../plugins/realtime.plugin';
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

// Mock online drivers around UB
const MOCK_DRIVERS: OnlineDriver[] = [
  { id: 'drv-001', firstName: 'Анхбаяр', lastName: 'Дамдин', phone: '88001122', vehicleType: 'MOTORCYCLE', vehiclePlate: '2345-УБА', rating: 4.9, lat: 47.9180, lng: 106.9900 },
  { id: 'drv-002', firstName: 'Болд', lastName: 'Ганбаяр', phone: '99112233', vehicleType: 'CAR', vehiclePlate: '3456-УВА', rating: 4.7, lat: 47.9100, lng: 106.9200 },
  { id: 'drv-003', firstName: 'Сарнай', lastName: 'Батсүх', phone: '88223344', vehicleType: 'MOTORCYCLE', vehiclePlate: '1234-УБА', rating: 4.8, lat: 47.9300, lng: 106.9100 },
];

function findNearestDrivers(lat: number, lng: number, radiusKm: number): OnlineDriver[] {
  return MOCK_DRIVERS
    .map((d) => ({ driver: d, dist: haversineDistance(lat, lng, d.lat, d.lng) }))
    .filter(({ dist }) => dist <= radiusKm)
    .sort((a, b) => a.dist - b.dist)
    .map(({ driver }) => driver);
}

export async function dispatchOrder(
  orderId: string,
  pickupLat: number,
  pickupLng: number,
  customerId?: string,
  pickupStops?: Array<{ supplierId: string; name: string; district: string }>,
): Promise<DispatchResult> {
  const orderNumber = generateOrderNumber();
  dispatchState.set(orderId, { status: 'SEARCHING', orderNumber });

  // Find nearest drivers within 5km, expand to 10km if none
  let candidates = findNearestDrivers(pickupLat, pickupLng, SEARCH_RADIUS_KM_FIRST);
  if (candidates.length === 0) {
    candidates = findNearestDrivers(pickupLat, pickupLng, SEARCH_RADIUS_KM_EXPAND);
  }

  if (candidates.length === 0) {
    const result: DispatchResult = { status: 'TIMEOUT', orderNumber };
    dispatchState.set(orderId, result);
    return result;
  }

  const offered = candidates[0];
  const offeredResult: DispatchResult = { status: 'OFFERED', driver: offered, orderNumber, offeredAt: new Date() };
  dispatchState.set(orderId, offeredResult);

  // Notify the chosen driver via WebSocket + FCM
  const deliveryFee = 8500 * 100; // mock fee in cents
  const distance = haversineDistance(pickupLat, pickupLng, offered.lat, offered.lng);

  emitToDriver(offered.id, 'delivery:request', {
    driverId: offered.id,
    orderId,
    orderNumber,
    fee: deliveryFee,
    pickupStops: pickupStops ?? [],
    dropoff: { district: 'Чингэлтэй' },
  });

  void sendDriverNewOrderNotification(offered.id, {
    orderId,
    orderNumber,
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
        orderNumber,
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
          orderNumber,
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
