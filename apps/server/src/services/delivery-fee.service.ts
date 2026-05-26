const EARTH_RADIUS_KM = 6371;

export interface PickupStop {
  lat: number;
  lng: number;
  supplierId?: string;
}

export interface FeeBreakdown {
  baseFee: number;
  distanceFee: number;
  multiStopFee: number;
  weightFee: number;
  totalDistanceKm: number;
}

export interface DeliveryFeeResult {
  fee: number;
  estimatedMinutes: number;
  breakdown: FeeBreakdown;
  orderedStops: PickupStop[];
}

// Minor units: ÷100 = ₮ display
const BASE_FEE = 300_000;        // ₮3,000
const PER_KM_FEE = 80_000;       // ₮800/km
const MULTI_STOP_FEE = 100_000;  // ₮1,000 per extra stop
const HEAVY_WEIGHT_KG = 50;
const HEAVY_FEE = 200_000;       // ₮2,000 for heavy loads
const ROUNDING_UNIT = 50_000;    // round up to nearest ₮500

// UB center as driver start approximation
const DRIVER_START = { lat: 47.9184, lng: 106.9917 };

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function calculateOptimalRoute(stops: PickupStop[]): PickupStop[] {
  if (stops.length <= 1) return [...stops];

  const remaining = [...stops];
  const route: PickupStop[] = [];
  let current = DRIVER_START;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }
    current = remaining[nearestIdx];
    route.push(current);
    remaining.splice(nearestIdx, 1);
  }
  return route;
}

export function calculateDeliveryFee(
  pickupStops: PickupStop[],
  dropoff: { lat: number; lng: number },
  totalWeightKg = 0,
): DeliveryFeeResult {
  const orderedStops = calculateOptimalRoute(pickupStops);

  let totalDistanceKm = 0;
  let prev = DRIVER_START;
  for (const stop of orderedStops) {
    totalDistanceKm += haversineDistance(prev.lat, prev.lng, stop.lat, stop.lng);
    prev = stop;
  }
  totalDistanceKm += haversineDistance(prev.lat, prev.lng, dropoff.lat, dropoff.lng);

  const distanceFee = Math.round(totalDistanceKm * PER_KM_FEE);
  const multiStopFee = Math.max(0, pickupStops.length - 1) * MULTI_STOP_FEE;
  const weightFee = totalWeightKg > HEAVY_WEIGHT_KG ? HEAVY_FEE : 0;

  const rawFee = BASE_FEE + distanceFee + multiStopFee + weightFee;
  const fee = Math.ceil(rawFee / ROUNDING_UNIT) * ROUNDING_UNIT;

  // Estimate: 30 min base + 3 min/km
  const estimatedMinutes = Math.round(30 + totalDistanceKm * 3);

  return {
    fee,
    estimatedMinutes,
    breakdown: { baseFee: BASE_FEE, distanceFee, multiStopFee, weightFee, totalDistanceKm },
    orderedStops,
  };
}
