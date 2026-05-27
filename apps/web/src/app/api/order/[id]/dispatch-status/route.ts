import { NextRequest, NextResponse } from 'next/server';

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

interface PickupStop {
  supplierName: string;
  address: string;
  status: 'PENDING' | 'PICKED_UP';
}

interface DispatchResponse {
  status: DispatchStatus;
  orderNumber?: string;
  driver?: MockDriver;
  estimatedArrivalMinutes?: number;
  driverLat?: number;
  driverLng?: number;
  pickupStops?: PickupStop[];
}

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

const MOCK_STOPS: PickupStop[] = [
  { supplierName: 'БудагМаркет ХХК', address: 'Баянзүрх, Барилгачдын гудамж 15', status: 'PICKED_UP' },
  { supplierName: 'Тоног Хэрэгсэл ХХК', address: 'Сүхбаатар, Гэгээн Өндөр 22', status: 'PENDING' },
];

// Per-order first-seen timestamp (resets on server restart)
const orderFirstSeen = new Map<string, number>();
// Per-order generated number (DIY-YYYY-XXXXX)
const orderNumbers = new Map<string, string>();

let counter = 1000;

function getOrCreateOrderNumber(id: string): string {
  if (!orderNumbers.has(id)) {
    counter += 1;
    const year = new Date().getFullYear();
    orderNumbers.set(id, `DIY-${year}-${String(counter).padStart(5, '0')}`);
  }
  return orderNumbers.get(id)!;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const now = Date.now();
  if (!orderFirstSeen.has(id)) {
    orderFirstSeen.set(id, now);
  }
  const elapsed = (now - orderFirstSeen.get(id)!) / 1000;

  const orderNumber = getOrCreateOrderNumber(id);
  let response: DispatchResponse;

  if (elapsed < 5) {
    response = { status: 'SEARCHING', orderNumber };
  } else if (elapsed < 10) {
    response = {
      status: 'OFFERED',
      orderNumber,
      driver: MOCK_DRIVER,
      estimatedArrivalMinutes: 18,
      pickupStops: MOCK_STOPS,
    };
  } else if (elapsed < 15) {
    response = {
      status: 'ACCEPTED',
      orderNumber,
      driver: MOCK_DRIVER,
      estimatedArrivalMinutes: 15,
      driverLat: MOCK_DRIVER.lat,
      driverLng: MOCK_DRIVER.lng,
      pickupStops: MOCK_STOPS,
    };
  } else {
    const progress = Math.min((elapsed - 15) / 60, 1);
    const targetLat = 47.9200;
    const targetLng = 106.9500;
    const driverLat = MOCK_DRIVER.lat + (targetLat - MOCK_DRIVER.lat) * progress;
    const driverLng = MOCK_DRIVER.lng + (targetLng - MOCK_DRIVER.lng) * progress;
    const eta = Math.max(0, Math.round(15 - progress * 15));

    const stops: PickupStop[] = [
      { ...MOCK_STOPS[0], status: 'PICKED_UP' },
      { ...MOCK_STOPS[1], status: progress > 0.5 ? 'PICKED_UP' : 'PENDING' },
    ];

    response = {
      status: elapsed > 75 ? 'COMPLETED' : 'IN_PROGRESS',
      orderNumber,
      driver: MOCK_DRIVER,
      estimatedArrivalMinutes: eta,
      driverLat,
      driverLng,
      pickupStops: stops,
    };
  }

  return NextResponse.json(response);
}
