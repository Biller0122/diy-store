import { NextRequest, NextResponse } from 'next/server';

// Mock dispatch state — in production this would hit the backend
type DispatchStatus = 'SEARCHING' | 'OFFERED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface MockDriver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  rating: number;
  lat: number;
  lng: number;
}

interface DispatchResponse {
  status: DispatchStatus;
  driver?: MockDriver;
  estimatedArrivalMinutes?: number;
  driverLat?: number;
  driverLng?: number;
}

// Simulate driver movement around UB
const MOCK_DRIVER: MockDriver = {
  id: 'drv-001',
  name: 'Анхбаяр Дамдин',
  phone: '8800-1122',
  vehicleType: 'MOTORCYCLE',
  vehiclePlate: '2345-УБА',
  rating: 4.9,
  lat: 47.9180,
  lng: 106.9900,
};

// In-memory per-order state (resets on server restart — acceptable for demo)
const orderFirstSeen = new Map<string, number>();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const now = Date.now();
  if (!orderFirstSeen.has(id)) {
    orderFirstSeen.set(id, now);
  }
  const elapsed = (now - orderFirstSeen.get(id)!) / 1000; // seconds

  let response: DispatchResponse;

  if (elapsed < 5) {
    response = { status: 'SEARCHING' };
  } else if (elapsed < 10) {
    response = { status: 'OFFERED', driver: MOCK_DRIVER, estimatedArrivalMinutes: 18 };
  } else if (elapsed < 15) {
    response = { status: 'ACCEPTED', driver: MOCK_DRIVER, estimatedArrivalMinutes: 15, driverLat: MOCK_DRIVER.lat, driverLng: MOCK_DRIVER.lng };
  } else {
    // Simulate driver moving toward pickup point
    const progress = Math.min((elapsed - 15) / 60, 1); // 60s journey
    const targetLat = 47.9200;
    const targetLng = 106.9500;
    const driverLat = MOCK_DRIVER.lat + (targetLat - MOCK_DRIVER.lat) * progress;
    const driverLng = MOCK_DRIVER.lng + (targetLng - MOCK_DRIVER.lng) * progress;
    const eta = Math.max(0, Math.round(15 - progress * 15));

    response = {
      status: elapsed > 75 ? 'COMPLETED' : 'IN_PROGRESS',
      driver: MOCK_DRIVER,
      estimatedArrivalMinutes: eta,
      driverLat,
      driverLng,
    };
  }

  return NextResponse.json(response);
}
