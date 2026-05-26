import { haversineDistance } from './delivery-fee.service';

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
  offeredAt?: Date;
  acceptedAt?: Date;
}

const SEARCH_RADIUS_KM_FIRST = 5;
const SEARCH_RADIUS_KM_EXPAND = 10;
const OFFER_TIMEOUT_MS = 30_000;
const MOCK_ACCEPT_DELAY_MS = 5_000;

// In-memory dispatch state for mock (real impl uses DB)
const dispatchState = new Map<string, DispatchResult>();

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
): Promise<DispatchResult> {
  dispatchState.set(orderId, { status: 'SEARCHING' });

  // Find nearest drivers within 5km, expand to 10km if none
  let candidates = findNearestDrivers(pickupLat, pickupLng, SEARCH_RADIUS_KM_FIRST);
  if (candidates.length === 0) {
    candidates = findNearestDrivers(pickupLat, pickupLng, SEARCH_RADIUS_KM_EXPAND);
  }

  if (candidates.length === 0) {
    const result: DispatchResult = { status: 'TIMEOUT' };
    dispatchState.set(orderId, result);
    return result;
  }

  const offered = candidates[0];
  const offeredResult: DispatchResult = { status: 'OFFERED', driver: offered, offeredAt: new Date() };
  dispatchState.set(orderId, offeredResult);

  // Mock: auto-accept after 5 seconds
  return new Promise((resolve) => {
    const acceptTimer = setTimeout(() => {
      const accepted: DispatchResult = {
        ...offeredResult,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      };
      dispatchState.set(orderId, accepted);
      resolve(accepted);
    }, MOCK_ACCEPT_DELAY_MS);

    // Timeout if no accept in 30s
    setTimeout(() => {
      clearTimeout(acceptTimer);
      if (dispatchState.get(orderId)?.status !== 'ACCEPTED') {
        const timeout: DispatchResult = { status: 'TIMEOUT' };
        dispatchState.set(orderId, timeout);
        resolve(timeout);
      }
    }, OFFER_TIMEOUT_MS);
  });
}

export function getDispatchStatus(orderId: string): DispatchResult {
  return dispatchState.get(orderId) ?? { status: 'SEARCHING' };
}
