import { haversineDistance } from './delivery-fee.service';
import { emitToDriver, emitToOrder, getOnlineDriversSnapshot, registerDriverOfferHandlers } from '../plugins/realtime.plugin';
import { deleteJsonState, getJsonState, setJsonState } from './redis-state.service';
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
const DISPATCH_MAX_ATTEMPTS = Math.max(1, Number(process.env.DISPATCH_MAX_ATTEMPTS || 20));
const DISPATCH_STATE_TTL_SECONDS = 60 * 60 * 24;
const PENDING_OFFER_TTL_SECONDS = 60 * 5;

// In-memory dispatch state for the active realtime offer lifecycle.
const dispatchState = new Map<string, DispatchResult>();
const pendingOffers = new Map<string, {
  drivers: OnlineDriver[];
  orderNumber: string;
  customerId?: string;
  customer?: DispatchCustomerInfo;
  resolve: (result: DispatchResult) => void;
  timeout: ReturnType<typeof setTimeout>;
  rejectedDriverIds: Set<string>;
}>();

function createFallbackOrderNumber(): string {
  const year = new Date().getFullYear();
  return `DIY-${year}-${Date.now().toString(36).toUpperCase()}`;
}

async function setDispatchState(orderId: string, result: DispatchResult) {
  dispatchState.set(orderId, result);
  await setJsonState(`diy:dispatch:state:${orderId}`, result, DISPATCH_STATE_TTL_SECONDS);
}

async function setPendingOfferState(
  orderId: string,
  offer: { drivers: OnlineDriver[]; orderNumber: string; expiresAt: string; attempt: number },
) {
  await setJsonState(`diy:dispatch:pending:${orderId}`, offer, PENDING_OFFER_TTL_SECONDS);
}

async function clearPendingOfferState(orderId: string) {
  await deleteJsonState(`diy:dispatch:pending:${orderId}`);
}

async function findNearestDrivers(
  lat: number,
  lng: number,
  radiusKm: number,
  fallbackDrivers: OnlineDriver[] = [],
): Promise<OnlineDriver[]> {
  const online = await getOnlineDriversSnapshot();
  if (online.length === 0 && fallbackDrivers.length === 0) return [];
  const realOnline: OnlineDriver[] = online.map((info) => ({
    id: info.id,
    firstName: info.firstName ?? 'Жолооч',
    lastName: info.lastName ?? '',
    phone: info.phone ?? '',
    vehicleType: info.vehicleType ?? 'CAR',
    vehiclePlate: info.vehiclePlate ?? '',
    rating: info.rating ?? 5,
    lat: info.lat,
    lng: info.lng,
  }));
  const candidates = realOnline.length > 0 ? realOnline : fallbackDrivers;
  return candidates
    .map((d) => ({ driver: d, dist: haversineDistance(lat, lng, d.lat, d.lng) }))
    .filter(({ dist }) => dist <= radiusKm)
    .sort((a, b) => a.dist - b.dist)
    .map(({ driver }) => driver);
}

async function findAllOnlineDrivers(
  lat: number,
  lng: number,
  fallbackDrivers: OnlineDriver[] = [],
): Promise<OnlineDriver[]> {
  const online = await getOnlineDriversSnapshot();
  const realOnline: OnlineDriver[] = online.map((info) => ({
    id: info.id,
    firstName: info.firstName ?? 'Жолооч',
    lastName: info.lastName ?? '',
    phone: info.phone ?? '',
    vehicleType: info.vehicleType ?? 'CAR',
    vehiclePlate: info.vehiclePlate ?? '',
    rating: info.rating ?? 5,
    lat: info.lat,
    lng: info.lng,
  }));
  const byId = new Map<string, OnlineDriver>();
  for (const driver of [...fallbackDrivers, ...realOnline]) {
    byId.set(driver.id, driver);
  }
  return Array.from(byId.values())
    .map((driver) => ({ driver, dist: haversineDistance(lat, lng, driver.lat, driver.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .map(({ driver }) => driver);
}

export interface DispatchPickupStop {
  supplierId: string;
  name: string;
  district?: string;
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
  deliveryFee = 0,
  routeDistanceKm = 0,
  estimatedMinutes = 0,
  fallbackDrivers: OnlineDriver[] = [],
): Promise<DispatchResult> {
  const resolvedOrderNumber = orderNumber ?? createFallbackOrderNumber();
  await setDispatchState(orderId, { status: 'SEARCHING', orderNumber: resolvedOrderNumber });

  const offeredFee = deliveryFee || 8500 * 100;
  const offeredDistance = routeDistanceKm || 0;
  const offeredEstimatedMinutes = estimatedMinutes || Math.round(offeredDistance * 3 + 5);

  return new Promise((resolve) => {
    const notifyRound = async (attempt: number) => {
      if (dispatchState.get(orderId)?.status === 'ACCEPTED') return;

      let candidates = await findAllOnlineDrivers(pickupLat, pickupLng, fallbackDrivers);
      if (candidates.length === 0) {
        candidates = await findNearestDrivers(pickupLat, pickupLng, SEARCH_RADIUS_KM_FIRST, fallbackDrivers);
      }
      if (candidates.length === 0) {
        candidates = await findNearestDrivers(pickupLat, pickupLng, SEARCH_RADIUS_KM_EXPAND, fallbackDrivers);
      }

      if (dispatchState.get(orderId)?.status === 'ACCEPTED') return;

      if (candidates.length === 0 && attempt >= DISPATCH_MAX_ATTEMPTS) {
        pendingOffers.delete(orderId);
        void clearPendingOfferState(orderId);
        const timeout: DispatchResult = { status: 'TIMEOUT', orderNumber: resolvedOrderNumber };
        void setDispatchState(orderId, timeout);
        if (customerId) {
          void sendCustomerStatusNotification(customerId, resolvedOrderNumber, 'CANCELLED');
        }
        resolve(timeout);
        return;
      }

      if (candidates.length > 0) {
        const primary = candidates[0];
        const offeredResult: DispatchResult = { status: 'OFFERED', driver: primary, orderNumber: resolvedOrderNumber, offeredAt: new Date() };
        await setDispatchState(orderId, offeredResult);

        for (const driver of candidates) {
          const distance = haversineDistance(pickupLat, pickupLng, driver.lat, driver.lng);
          const driverDistance = routeDistanceKm || distance;
          emitToDriver(driver.id, 'delivery:request', {
            driverId: driver.id,
            orderId,
            orderNumber: resolvedOrderNumber,
            fee: offeredFee,
            pickupStops: (pickupStops ?? []).map((s) => ({
              supplierId: s.supplierId,
              name: s.name,
              district: s.district ?? s.address.split(',')[0]?.trim() ?? '',
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
            distance: Math.round(driverDistance * 10) / 10,
            estimatedMinutes: offeredEstimatedMinutes,
          });

          void sendDriverNewOrderNotification(driver.id, {
            orderId,
            orderNumber: resolvedOrderNumber,
            fee: offeredFee,
            distance: driverDistance,
            pickupCount: pickupStops?.length ?? 1,
            dropoffDistrict: customer?.district ?? 'Улаанбаатар',
          });
        }
      } else {
        await setDispatchState(orderId, { status: 'SEARCHING', orderNumber: resolvedOrderNumber });
      }

      const timeout = setTimeout(() => {
        const current = pendingOffers.get(orderId);
        if (!current || dispatchState.get(orderId)?.status === 'ACCEPTED') return;
        if (attempt >= DISPATCH_MAX_ATTEMPTS) {
          pendingOffers.delete(orderId);
          void clearPendingOfferState(orderId);
          const timeoutResult: DispatchResult = { status: 'TIMEOUT', orderNumber: resolvedOrderNumber };
          void setDispatchState(orderId, timeoutResult);
          if (customerId) {
            void sendCustomerStatusNotification(customerId, resolvedOrderNumber, 'CANCELLED');
          }
          resolve(timeoutResult);
          return;
        }
        void notifyRound(attempt + 1);
      }, OFFER_TIMEOUT_MS);

      pendingOffers.set(orderId, {
        drivers: candidates,
        orderNumber: resolvedOrderNumber,
        customerId,
        customer,
        resolve,
        timeout,
        rejectedDriverIds: new Set(),
      });
      void setPendingOfferState(orderId, {
        drivers: candidates,
        orderNumber: resolvedOrderNumber,
        expiresAt: new Date(Date.now() + OFFER_TIMEOUT_MS).toISOString(),
        attempt,
      });
    };

    void notifyRound(1);
  });
}

function acceptDispatchOffer({ driverId, orderId }: { driverId: string; orderId: string }): boolean {
  const offer = pendingOffers.get(orderId);
  const acceptedDriver = offer?.drivers.find((driver) => driver.id === driverId);
  if (!offer || !acceptedDriver) return false;
  clearTimeout(offer.timeout);
  pendingOffers.delete(orderId);
  void clearPendingOfferState(orderId);
  const accepted: DispatchResult = {
    status: 'ACCEPTED',
    driver: acceptedDriver,
    orderNumber: offer.orderNumber,
    acceptedAt: new Date(),
  };
  void setDispatchState(orderId, accepted);
  emitToOrder(orderId, 'order:driver_assigned', {
    orderId,
    orderNumber: offer.orderNumber,
    driver: {
      id: acceptedDriver.id,
      name: `${acceptedDriver.firstName} ${acceptedDriver.lastName}`.trim() || 'Жолооч',
      phone: acceptedDriver.phone,
      vehicleType: acceptedDriver.vehicleType,
      vehiclePlate: acceptedDriver.vehiclePlate,
      rating: acceptedDriver.rating,
    },
    estimatedMinutes: 15,
  });
  if (offer.customerId) {
    void sendCustomerDriverAssignedNotification(offer.customerId, {
      orderNumber: offer.orderNumber,
      driverName: `${acceptedDriver.firstName} ${acceptedDriver.lastName}`.trim() || 'Жолооч',
      driverPhone: acceptedDriver.phone,
      estimatedMinutes: 15,
    });
  }
  offer.resolve(accepted);
  return true;
}

function rejectDispatchOffer({ driverId, orderId }: { driverId: string; orderId: string }): boolean {
  const offer = pendingOffers.get(orderId);
  if (!offer || !offer.drivers.some((driver) => driver.id === driverId)) return false;
  offer.rejectedDriverIds.add(driverId);
  return true;
}

registerDriverOfferHandlers({
  accept: acceptDispatchOffer,
  reject: rejectDispatchOffer,
});

export async function getDispatchStatus(orderId: string): Promise<DispatchResult> {
  const persisted = await getJsonState<DispatchResult>(`diy:dispatch:state:${orderId}`);
  return persisted ?? dispatchState.get(orderId) ?? { status: 'SEARCHING' };
}

export async function updateDispatchStatus(orderId: string, status: DispatchResult['status'], customerId?: string) {
  const current = await getDispatchStatus(orderId);
  if (!current) return;
  await setDispatchState(orderId, { ...current, status });

  emitToOrder(orderId, 'order:status', { orderId, status });

  if (customerId && current.orderNumber) {
    void sendCustomerStatusNotification(customerId, current.orderNumber, status);
  }
}
