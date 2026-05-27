import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DRIVER_PROFILE_QUERY,
  LOGIN_DRIVER_BY_PASSWORD_MUTATION,
  LOGIN_DRIVER_MUTATION,
  LOGOUT_MUTATION,
  REGISTER_DRIVER_MUTATION,
  SET_ONLINE_STATUS_MUTATION,
  VERIFY_DRIVER_OTP_MUTATION,
  shopFetch,
} from './api';

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phone: string;
  vehicleType: 'MOTORCYCLE' | 'CAR' | 'VAN';
  vehiclePlate: string | null;
  vehicleModel: string | null;
  status?: string;
  isOnline?: boolean;
  rating: number;
  totalDeliveries: number;
  todayEarnings: number;
  totalEarnings: number;
}

export interface ActiveDelivery {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  fee: number;
  distance: number;
  status: string;
  estimatedMinutes: number;
}

export interface DeliveryRequest {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  customerName: string;
  fee: number;
  distance: number;
  estimatedMinutes: number;
}

interface DriverStore {
  driver: Driver | null;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  activeDelivery: ActiveDelivery | null;
  pendingRequest: DeliveryRequest | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  toggleOnline: () => Promise<void>;
  acceptDelivery: (request: DeliveryRequest) => void;
  rejectDelivery: () => void;
  completeDelivery: () => void;
  clearError: () => void;
}

const ERROR_MAP: Record<string, string> = {
  INVALID_CREDENTIALS_ERROR: 'И-мэйл эсвэл нууц үг буруу байна',
  NOT_VERIFIED_ERROR: 'И-мэйл баталгаажаагүй байна',
  NATIVE_AUTH_STRATEGY_ERROR: 'Нэвтрэх боломжгүй байна',
};

const DEMO_DRIVER_EMAIL = 'starbiller@gmail.com';
const DEMO_DRIVER_PASSWORD = 'Odbayar22';
const DEMO_DRIVER_PHONE = '99112233';
const DEV_OTP = '1234';

function isDemoDriverLogin(email: string, password: string) {
  return email.toLowerCase() === DEMO_DRIVER_EMAIL && password === DEMO_DRIVER_PASSWORD;
}

type DriverProfileResponse = {
  getDriverProfile: Omit<Driver, 'emailAddress'> & {
    emailAddress?: string;
    vehicleType: Driver['vehicleType'];
  };
};

function normalizeDbDriver(driver: DriverProfileResponse['getDriverProfile']): Driver {
  return {
    ...driver,
    emailAddress: driver.emailAddress ?? DEMO_DRIVER_EMAIL,
    vehiclePlate: driver.vehiclePlate ?? 'Бүртгээгүй',
    vehicleModel: driver.vehicleModel ?? 'Бүртгээгүй',
  };
}

function buildDriver(customer: {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
}): Driver {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    emailAddress: customer.emailAddress,
    phone: customer.phoneNumber ?? '',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: '7777УБА',
    vehicleModel: 'Honda PCX150',
    rating: 4.8,
    totalDeliveries: 143,
    todayEarnings: 45000,
    totalEarnings: 3200000,
  };
}

const MOCK_PENDING_REQUEST: DeliveryRequest = {
  id: 'req-001',
  pickupAddress: 'Баянзүрх дүүрэг, DIY Store агуулах, 3-р хороо',
  dropoffAddress: 'Сүхбаатар дүүрэг, Олимпийн гудамж 14',
  customerName: 'Болд Баатар',
  fee: 8500,
  distance: 4.3,
  estimatedMinutes: 18,
};

let pendingRequestTimer: ReturnType<typeof setTimeout> | null = null;

export const useDriverStore = create<DriverStore>()(
  persist(
    (set, get) => ({
      driver: null,
      isOnline: false,
      isLoading: false,
      error: null,
      activeDelivery: null,
      pendingRequest: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });

        if (isDemoDriverLogin(email.trim(), password)) {
          try {
            const auth = await shopFetch<{
              loginDriverByPassword: { success: boolean; message: string; driverId: string | null; token: string | null };
            }>(LOGIN_DRIVER_BY_PASSWORD_MUTATION, { email: email.trim(), password });
            if (!auth.loginDriverByPassword.success || !auth.loginDriverByPassword.driverId) {
              set({ isLoading: false, error: auth.loginDriverByPassword.message });
              return false;
            }

            const profile = await shopFetch<DriverProfileResponse>(DRIVER_PROFILE_QUERY, {
              id: auth.loginDriverByPassword.driverId,
            });
            set({ driver: normalizeDbDriver(profile.getDriverProfile), isOnline: profile.getDriverProfile.isOnline ?? false, isLoading: false, error: null });
            return true;
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Сүлжээний алдаа';
            set({ isLoading: false, error: message });
            return false;
          }
        }

        set({ isLoading: false, error: 'Жолоочийн эрхээр нэвтрэх бүртгэл олдсонгүй' });
        return false;
      },

      logout: () => {
        shopFetch(LOGOUT_MUTATION).catch(() => {});
        if (pendingRequestTimer) {
          clearTimeout(pendingRequestTimer);
          pendingRequestTimer = null;
        }
        set({ driver: null, isOnline: false, activeDelivery: null, pendingRequest: null, error: null });
      },

      toggleOnline: async () => {
        const { isOnline, driver } = get();
        if (!driver) return;
        const newOnline = !isOnline;
        set({ isOnline: newOnline, error: null });

        try {
          const updated = await shopFetch<{ setOnlineStatus: { isOnline: boolean } | null }>(
            SET_ONLINE_STATUS_MUTATION,
            { id: driver.id, isOnline: newOnline },
          );
          if (updated.setOnlineStatus) {
            set({ isOnline: updated.setOnlineStatus.isOnline });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Онлайн төлөв шинэчлэхэд алдаа гарлаа';
          set({ isOnline, error: message });
          return;
        }

        if (newOnline) {
          if (pendingRequestTimer) clearTimeout(pendingRequestTimer);
          pendingRequestTimer = setTimeout(() => {
            const state = get();
            if (state.isOnline && !state.activeDelivery && !state.pendingRequest) {
              set({ pendingRequest: MOCK_PENDING_REQUEST });
            }
          }, 10000);
        } else {
          if (pendingRequestTimer) {
            clearTimeout(pendingRequestTimer);
            pendingRequestTimer = null;
          }
          set({ pendingRequest: null });
        }
      },

      acceptDelivery: (request: DeliveryRequest) => {
        const delivery: ActiveDelivery = {
          id: request.id,
          orderId: 'ORD-2025-' + Math.floor(Math.random() * 9000 + 1000),
          customerName: request.customerName,
          customerPhone: '9911 2233',
          pickupAddress: request.pickupAddress,
          pickupLat: 47.9077,
          pickupLng: 106.8832,
          dropoffAddress: request.dropoffAddress,
          dropoffLat: 47.9180,
          dropoffLng: 106.9176,
          fee: request.fee,
          distance: request.distance,
          status: 'PENDING',
          estimatedMinutes: request.estimatedMinutes,
        };
        set({ pendingRequest: null, activeDelivery: delivery });
      },

      rejectDelivery: () => {
        set({ pendingRequest: null });
      },

      completeDelivery: () => {
        const { driver, activeDelivery } = get();
        if (!driver || !activeDelivery) return;
        set({
          activeDelivery: null,
          driver: {
            ...driver,
            totalDeliveries: driver.totalDeliveries + 1,
            todayEarnings: driver.todayEarnings + activeDelivery.fee,
            totalEarnings: driver.totalEarnings + activeDelivery.fee,
          },
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'diy-driver-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ driver: s.driver }),
    },
  ),
);
