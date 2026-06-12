import { NextRequest, NextResponse } from 'next/server';

// UB district center coordinates
const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  'Баянзүрх':         { lat: 47.9184, lng: 106.9917 },
  'Баянзүрх дүүрэг':  { lat: 47.9184, lng: 106.9917 },
  'Сүхбаатар':        { lat: 47.9138, lng: 106.9092 },
  'Сүхбаатар дүүрэг': { lat: 47.9138, lng: 106.9092 },
  'Хан-Уул':          { lat: 47.8713, lng: 106.8832 },
  'Хан-Уул дүүрэг':   { lat: 47.8713, lng: 106.8832 },
  'Чингэлтэй':        { lat: 47.9284, lng: 106.9256 },
  'Чингэлтэй дүүрэг': { lat: 47.9284, lng: 106.9256 },
  'Баянгол':          { lat: 47.9065, lng: 106.8513 },
  'Баянгол дүүрэг':   { lat: 47.9065, lng: 106.8513 },
  'Налайх':           { lat: 47.7573, lng: 107.2631 },
  'Налайх дүүрэг':    { lat: 47.7573, lng: 107.2631 },
  'Сонгинохайрхан':   { lat: 47.9264, lng: 106.8171 },
  'Сонгинохайрхан дүүрэг': { lat: 47.9264, lng: 106.8171 },
  'Багануур':         { lat: 47.7107, lng: 108.2849 },
  'Багануур дүүрэг':  { lat: 47.7107, lng: 108.2849 },
  'Багахангай':       { lat: 47.8480, lng: 107.2180 },
};

const EARTH_RADIUS_KM = 6371;
const DRIVER_START = { lat: 47.9184, lng: 106.9917 };
const BASE_FEE = 300_000;
const PER_KM_FEE = 80_000;
const MULTI_STOP_FEE = 100_000;
const HEAVY_FEE = 200_000;
const ROUNDING_UNIT = 50_000;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function nearestNeighbor(stops: { lat: number; lng: number }[]) {
  if (stops.length <= 1) return [...stops];
  const remaining = [...stops];
  const route: typeof stops = [];
  let cur = DRIVER_START;
  while (remaining.length > 0) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(cur.lat, cur.lng, remaining[i].lat, remaining[i].lng);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    cur = remaining[best];
    route.push(cur);
    remaining.splice(best, 1);
  }
  return route;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      pickupStops: { supplierId?: string; lat?: number; lng?: number; district?: string }[];
      dropoff: { lat?: number; lng?: number; district?: string; address?: string };
      totalWeightKg?: number;
    };

    const { pickupStops, dropoff, totalWeightKg = 0 } = body;

    // Resolve pickup coords
    const resolvedStops = pickupStops.map((s) => {
      if (s.lat != null && s.lng != null) return { lat: s.lat, lng: s.lng };
      const coords = s.district ? DISTRICT_COORDS[s.district] : null;
      if (!coords) {
        throw new Error(`Missing pickup location for supplier ${s.supplierId ?? 'unknown'}`);
      }
      return coords;
    });

    // Resolve dropoff coords
    let dropoffCoords = { lat: 47.9184, lng: 106.9917 };
    if (dropoff.lat != null && dropoff.lng != null) {
      dropoffCoords = { lat: dropoff.lat, lng: dropoff.lng };
    } else if (dropoff.district) {
      const c = DISTRICT_COORDS[dropoff.district];
      if (c) dropoffCoords = c;
    }

    const route = nearestNeighbor(resolvedStops);

    let totalDistanceKm = 0;
    let prev = DRIVER_START;
    for (const stop of route) {
      totalDistanceKm += haversine(prev.lat, prev.lng, stop.lat, stop.lng);
      prev = stop;
    }
    totalDistanceKm += haversine(prev.lat, prev.lng, dropoffCoords.lat, dropoffCoords.lng);

    const distanceFee = Math.round(totalDistanceKm * PER_KM_FEE);
    const multiStopFee = Math.max(0, pickupStops.length - 1) * MULTI_STOP_FEE;
    const weightFee = totalWeightKg > 50 ? HEAVY_FEE : 0;
    const raw = BASE_FEE + distanceFee + multiStopFee + weightFee;
    const fee = Math.ceil(raw / ROUNDING_UNIT) * ROUNDING_UNIT;
    const estimatedMinutes = Math.round(30 + totalDistanceKm * 3);

    return NextResponse.json({
      fee,
      estimatedMinutes,
      breakdown: {
        baseFee: BASE_FEE,
        distanceFee,
        multiStopFee,
        weightFee,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Delivery fee calculation failed',
        fallback: true,
        fee: 550_000,
        estimatedMinutes: 45,
        breakdown: null,
      },
      { status: 500 },
    );
  }
}
