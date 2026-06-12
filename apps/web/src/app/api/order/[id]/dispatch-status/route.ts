import { NextRequest, NextResponse } from 'next/server';

type DispatchStatus = 'SEARCHING' | 'OFFERED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface DriverSummary {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  rating: number;
  lat?: number | null;
  lng?: number | null;
}

interface DeliveryRequestResult {
  id: string;
  orderId: string;
  orderNumber: string;
  status: DispatchStatus;
  driverId?: string | null;
  driverLat?: number | null;
  driverLng?: number | null;
  estimatedDuration?: number | null;
  deliveryCode?: string | null;
  completedAt?: string | null;
  pickupStops?: Array<{
    supplierName: string;
    address: string;
    status: 'PENDING' | 'PICKED_UP';
  }>;
}

const SHOP_API = process.env.INTERNAL_VENDURE_SHOP_API ?? 'http://localhost:13001/shop-api';

const DELIVERY_STATUS_GQL = `
  query DeliveryStatus($orderId: String!) {
    deliveryRequest(orderId: $orderId) {
      id
      orderId
      orderNumber
      status
      driverId
      driverLat
      driverLng
      estimatedDuration
      deliveryCode
      completedAt
      pickupStops {
        supplierName
        address
        status
      }
    }
  }
`;

const DRIVER_GQL = `
  query DriverProfile($id: ID!) {
    getDriverProfile(id: $id) {
      id
      firstName
      lastName
      phone
      vehicleType
      vehiclePlate
      rating
      currentLat
      currentLng
    }
  }
`;

async function vendureFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const response = await fetch(SHOP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Vendure API ${response.status}`);
  const json = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error('Vendure API returned no data');
  return json.data;
}

async function getDriver(driverId?: string | null): Promise<DriverSummary | undefined> {
  if (!driverId) return undefined;
  const data = await vendureFetch<{
    getDriverProfile: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      vehicleType: string;
      vehiclePlate?: string | null;
      rating: number;
      currentLat?: number | null;
      currentLng?: number | null;
    } | null;
  }>(DRIVER_GQL, { id: driverId });
  const driver = data.getDriverProfile;
  if (!driver) return undefined;
  return {
    id: driver.id,
    name: `${driver.firstName} ${driver.lastName}`.trim() || 'Жолооч',
    phone: driver.phone,
    vehicleType: driver.vehicleType,
    vehiclePlate: driver.vehiclePlate ?? '',
    rating: driver.rating,
    lat: driver.currentLat,
    lng: driver.currentLng,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1] ?? null;

  try {
    const data = await vendureFetch<{ deliveryRequest: DeliveryRequestResult | null }>(
      DELIVERY_STATUS_GQL,
      { orderId: id },
      token,
    );
    const delivery = data.deliveryRequest;
    if (!delivery) {
      return NextResponse.json({ status: 'SEARCHING', orderNumber: id });
    }

    const driver = await getDriver(delivery.driverId);
    return NextResponse.json({
      status: delivery.status,
      orderNumber: delivery.orderNumber,
      driver,
      estimatedArrivalMinutes: delivery.estimatedDuration ?? undefined,
      driverLat: delivery.driverLat ?? driver?.lat,
      driverLng: delivery.driverLng ?? driver?.lng,
      deliveryCode: delivery.deliveryCode ?? undefined,
      completedAt: delivery.completedAt ?? undefined,
      pickupStops: delivery.pickupStops ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'SEARCHING', orderNumber: id, error: err instanceof Error ? err.message : 'Dispatch status unavailable' },
      { status: 502 },
    );
  }
}
