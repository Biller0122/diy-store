import { haversineDistance } from './delivery-fee.service';
import { emitToDriver, emitToOrder, getOnlineDrivers, registerDriverOfferHandlers } from '../plugins/realtime.plugin';
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

// In-memory dispatch state for the active realtime offer lifecycle.
const dispatchState = new Map<string, DispatchResult>();
const pendingOffers = new Map<string, {
  driver: OnlineDriver;
  orderNumber: string;
  customerId?: string;
  customer?: DispatchCustomerInfo;
  resolve: (result: DispatchResult) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

// FIX 4 — Order number counter (resets on restart; real impl uses DB sequence)
let orderCounter = 1000;

export function generateOrderNumber(): string {
  orderCounter += 1;
  const year = new Date().getFullYear();
  return `DIY-${year}-${String(orderCounter).padStart(5, '0')}`;
}

function findNearestDrivers(lat: number, lng: number, radiusKm: number): OnlineDriver[] {
  const online = getOnlineDrivers();
  if (online.size === 0) return [];
  const realOnline: OnlineDriver[] = Array.from(online.entries()).map(([driverId, info]) => ({
    id: driverId,
    firstName: 'Жолооч',
    lastName: '',
    phone: '',
    vehicleType: 'CAR',
    vehiclePlate: '',
    rating: 5,
    lat: info.lat,
    lng: info.lng,
  }));
  return realOnline
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

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingOffers.delete(orderId);
      if (dispatchState.get(orderId)?.status !== 'ACCEPTED') {
        const timeout: DispatchResult = { status: 'TIMEOUT', orderNumber };
        dispatchState.set(orderId, timeout);

        if (customerId) {
          void sendCustomerStatusNotification(customerId, orderNumber, 'CANCELLED');
        }

        resolve(timeout);
      }
    }, OFFER_TIMEOUT_MS);
    pendingOffers.set(orderId, { driver: offered, orderNumber: resolvedOrderNumber, customerId, customer, resolve, timeout });
  });
}

function acceptDispatchOffer({ driverId, orderId }: { driverId: string; orderId: string }) {
  const offer = pendingOffers.get(orderId);
  if (!offer || offer.driver.id !== driverId) return;
  clearTimeout(offer.timeout);
  pendingOffers.delete(orderId);
  const accepted: DispatchResult = {
    status: 'ACCEPTED',
    driver: offer.driver,
    orderNumber: offer.orderNumber,
    acceptedAt: new Date(),
  };
  dispatchState.set(orderId, accepted);
  emitToOrder(orderId, 'order:driver_assigned', {
    orderId,
    orderNumber: offer.orderNumber,
    driver: {
      id: offer.driver.id,
      name: `${offer.driver.firstName} ${offer.driver.lastName}`.trim() || 'Жолооч',
      phone: offer.driver.phone,
      vehicleType: offer.driver.vehicleType,
      vehiclePlate: offer.driver.vehiclePlate,
      rating: offer.driver.rating,
    },
    estimatedMinutes: 15,
  });
  if (offer.customerId) {
    void sendCustomerDriverAssignedNotification(offer.customerId, {
      orderNumber: offer.orderNumber,
      driverName: `${offer.driver.firstName} ${offer.driver.lastName}`.trim() || 'Жолооч',
      driverPhone: offer.driver.phone,
      estimatedMinutes: 15,
    });
  }
  offer.resolve(accepted);
}

function rejectDispatchOffer({ driverId, orderId }: { driverId: string; orderId: string }) {
  const offer = pendingOffers.get(orderId);
  if (!offer || offer.driver.id !== driverId) return;
  clearTimeout(offer.timeout);
  pendingOffers.delete(orderId);
  const timeout: DispatchResult = { status: 'TIMEOUT', orderNumber: offer.orderNumber };
  dispatchState.set(orderId, timeout);
  if (offer.customerId) {
    void sendCustomerStatusNotification(offer.customerId, offer.orderNumber, 'CANCELLED');
  }
  offer.resolve(timeout);
}

registerDriverOfferHandlers({
  accept: acceptDispatchOffer,
  reject: rejectDispatchOffer,
});

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
