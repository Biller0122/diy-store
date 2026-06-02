import { GraphQLClient } from 'graphql-request';
import { GET_ACTIVE_ORDER, GET_DRIVER_DELIVERY_HISTORY, GET_DRIVER_PROFILE } from './queries';
import { ACCEPT_DELIVERY, COMPLETE_DELIVERY_WITH_CODE, LOGIN_DRIVER, LOGIN_DRIVER_BY_PASSWORD, REFRESH_DRIVER_TOKEN, REGISTER_DRIVER, REJECT_DELIVERY, UPDATE_DELIVERY_STATUS, UPDATE_DRIVER_LOCATION, UPDATE_DRIVER_STATUS, VERIFY_DRIVER_OTP } from './mutations';

export const SHOP_API_URL = process.env.EXPO_PUBLIC_SHOP_API_URL ?? 'http://192.168.0.13:13001/shop-api';

const client = new GraphQLClient(SHOP_API_URL, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  client.setHeader('Authorization', token ? `Bearer ${token}` : '');
}

export async function request<T>(query: string, variables?: Record<string, unknown>) {
  return client.request<T>(query, variables);
}

export type VehicleType = 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
export type DriverStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phone: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  vehicleModel: string;
  status: DriverStatus;
  isOnline: boolean;
  rating: number;
  totalDeliveries: number;
  todayEarnings: number;
  totalEarnings: number;
  bankName?: string;
  bankAccount?: string;
  createdAt?: string;
};

type DeliveryMutationResult = {
  id: string;
  status: string;
  driverId?: string | null;
};

export type ActiveDeliveryResult = {
  id: string;
  orderId: string;
  orderNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  distance: number;
  estimatedDuration: number;
  proposedFee: number;
  status: string;
  pickupStops: Array<{
    supplierId: string;
    supplierName: string;
    district?: string | null;
    address: string;
    phone?: string | null;
    lat: number;
    lng: number;
    status?: string | null;
  }>;
  orderItems: Array<{ supplierId?: string | null; name: string; qty: number }>;
};

export type DriverDeliveryHistoryResult = {
  id: string;
  orderNumber: string;
  customerName: string;
  dropoffAddress: string;
  distance: number;
  finalFee: number;
  proposedFee: number;
  status: 'COMPLETED' | 'CANCELLED';
  pickupStops: Array<{
    supplierId: string;
    supplierName: string;
    district?: string | null;
    address: string;
  }>;
  orderItems: Array<{ name: string; qty: number; price: number }>;
  updatedAt: string;
};

export async function requestDriverOtp(phone: string) {
  return request<{ loginDriver: { success: boolean; message: string; phone: string | null; otp: string | null } }>(LOGIN_DRIVER, { phone });
}

export async function verifyDriverOtp(phone: string, otp: string) {
  return request<{ verifyDriverOTP: { success: boolean; message: string; driverId: string | null; token: string | null } }>(VERIFY_DRIVER_OTP, { phone, otp });
}

export async function refreshDriverToken(id: string, phone: string) {
  return request<{ refreshDriverToken: { success: boolean; message: string; driverId: string | null; token: string | null } }>(REFRESH_DRIVER_TOKEN, { id, phone });
}

export async function loginDriver(email: string, password: string) {
  return request<{ loginDriverByPassword: { success: boolean; message: string; driverId: string | null; token: string | null } }>(LOGIN_DRIVER_BY_PASSWORD, { email, password });
}

export async function getDriverProfile(id: string) {
  const data = await request<{ getDriverProfile: (Omit<Driver, 'emailAddress'> & { emailAddress?: string | null }) | null }>(GET_DRIVER_PROFILE, { id });
  return {
    getDriverProfile: data.getDriverProfile
      ? { ...data.getDriverProfile, emailAddress: data.getDriverProfile.emailAddress ?? '' }
      : null,
  };
}

export async function registerDriver(input: Record<string, unknown>) {
  return request<{ registerDriver: { success: boolean; message: string; phone?: string | null; otp?: string | null } }>(REGISTER_DRIVER, { input });
}

export async function updateDriverStatus(id: string, isOnline: boolean) {
  return request<{ setOnlineStatus: { id: string; isOnline: boolean; status: string } | null }>(UPDATE_DRIVER_STATUS, { id, isOnline });
}

export async function updateDriverLocation(driverId: string, lat: number, lng: number, heading?: number | null, orderId?: string | null) {
  return request<{ updateDriverLocation: { id: string; currentLat: number | null; currentLng: number | null } }>(UPDATE_DRIVER_LOCATION, { id: driverId, lat, lng });
}

export async function acceptDeliveryApi(driverId: string, deliveryId: string) {
  return request<{ acceptDelivery: DeliveryMutationResult }>(ACCEPT_DELIVERY, { driverId, deliveryId });
}

export async function rejectDeliveryApi(driverId: string, deliveryId: string) {
  return request<{ rejectDelivery: DeliveryMutationResult }>(REJECT_DELIVERY, { driverId, deliveryId });
}

export async function updateDeliveryStatusApi(deliveryId: string, status: string) {
  return request<{ updateDeliveryStatus: DeliveryMutationResult }>(UPDATE_DELIVERY_STATUS, { deliveryId, status });
}

export async function completeDeliveryWithCodeApi(deliveryId: string, driverId: string, code: string) {
  return request<{ completeDeliveryWithCode: DeliveryMutationResult }>(COMPLETE_DELIVERY_WITH_CODE, { deliveryId, driverId, code });
}

export async function getActiveDeliveryApi(driverId: string) {
  return request<{ activeDeliveriesForDriver: ActiveDeliveryResult[] }>(GET_ACTIVE_ORDER, { driverId });
}

export async function getDriverEarnings(driverId: string, period: string) {
  const history = await getDriverDeliveryHistory(driverId, 100);
  const now = new Date();
  const from = period === 'today'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : period === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  const completed = history.deliveryHistoryForDriver.filter((item) =>
    item.status === 'COMPLETED' && new Date(item.updatedAt) >= from
  );
  const chartMap = new Map<string, { amount: number; count: number }>();
  completed.forEach((item) => {
    const label = periodLabel(new Date(item.updatedAt), period);
    const current = chartMap.get(label) ?? { amount: 0, count: 0 };
    chartMap.set(label, {
      amount: current.amount + (item.finalFee || item.proposedFee || 0),
      count: current.count + 1,
    });
  });
  const totalEarned = completed.reduce((sum, item) => sum + (item.finalFee || item.proposedFee || 0), 0);
  const totalDeliveries = completed.length;
  const chart = Array.from(chartMap.entries()).map(([label, value]) => ({ label, ...value }));
  const historyItems = completed.slice(0, 30).map((item) => ({
    id: item.id,
    orderNumber: item.orderNumber || item.id,
    date: new Date(item.updatedAt).toLocaleDateString('mn-MN'),
    supplierDistrict: item.pickupStops[0]?.district || item.pickupStops[0]?.address?.split(',')[0]?.trim() || 'Нийлүүлэгч',
    customerDistrict: item.dropoffAddress?.split(',')[0]?.trim() || 'Хэрэглэгч',
    customerAddress: item.dropoffAddress,
    fee: item.finalFee || item.proposedFee || 0,
    rating: 5,
  }));
  return {
    getDriverEarnings: {
      totalDeliveries,
      totalEarned,
      averageRating: 5,
      averagePerDelivery: totalDeliveries > 0 ? Math.round(totalEarned / totalDeliveries) : 0,
      chart,
      history: historyItems,
    },
  };
}

export async function getDriverDeliveryHistory(driverId: string, limit = 50) {
  return request<{ deliveryHistoryForDriver: DriverDeliveryHistoryResult[] }>(GET_DRIVER_DELIVERY_HISTORY, { driverId, limit });
}

function periodLabel(date: Date, period: string) {
  if (period === 'today') return `${date.getHours()}:00`;
  if (period === 'week') return ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'][date.getDay()];
  return `${date.getDate()}-р`;
}
