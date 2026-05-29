import { GraphQLClient } from 'graphql-request';
import { GET_DRIVER_EARNINGS, GET_DRIVER_PROFILE } from './queries';
import { ACCEPT_DELIVERY, LOGIN_DRIVER, REGISTER_DRIVER, REJECT_DELIVERY, UPDATE_DRIVER_LOCATION, UPDATE_DRIVER_STATUS, UPDATE_ORDER_STATUS } from './mutations';

export const SHOP_API_URL = process.env.EXPO_PUBLIC_SHOP_API_URL ?? 'http://192.168.0.13:3001/shop-api';

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

export async function loginDriver(email: string, password: string) {
  return request<{ loginDriverByPassword: { success: boolean; message: string; driverId: string | null; token: string | null } }>(LOGIN_DRIVER, { email, password });
}

export async function getDriverProfile(id: string) {
  const data = await request<{ getDriverProfile: (Omit<Driver, 'emailAddress'> & { emailAddress?: string | null }) | null }>(GET_DRIVER_PROFILE, { id });
  return {
    getDriverProfile: data.getDriverProfile
      ? { ...data.getDriverProfile, emailAddress: data.getDriverProfile.emailAddress ?? 'starbiller@gmail.com' }
      : null,
  };
}

export async function registerDriver(input: Record<string, unknown>) {
  return request<{ registerDriver: { success: boolean; message: string } }>(REGISTER_DRIVER, { input });
}

export async function updateDriverStatus(id: string, isOnline: boolean) {
  return request<{ setOnlineStatus: { id: string; isOnline: boolean; status: string } | null }>(UPDATE_DRIVER_STATUS, { id, isOnline });
}

export async function updateDriverLocation(driverId: string, lat: number, lng: number, heading?: number | null, orderId?: string | null) {
  return request<{ updateDriverLocation: { id: string; currentLat: number | null; currentLng: number | null } }>(UPDATE_DRIVER_LOCATION, { id: driverId, lat, lng });
}

export async function acceptDeliveryApi(driverId: string, orderId: string) {
  return request<{ acceptDelivery: { success: boolean; message?: string } }>(ACCEPT_DELIVERY, { driverId, orderId });
}

export async function rejectDeliveryApi(driverId: string, orderId: string) {
  return request<{ rejectDelivery: { success: boolean; message?: string } }>(REJECT_DELIVERY, { driverId, orderId });
}

export async function updateOrderStatusApi(driverId: string, orderId: string, status: string) {
  return request<{ updateOrderStatus: { success: boolean; message?: string } }>(UPDATE_ORDER_STATUS, { driverId, orderId, status });
}

export async function getDriverEarnings(driverId: string, period: string) {
  return request<{ getDriverEarnings: unknown }>(GET_DRIVER_EARNINGS, { driverId, period });
}
