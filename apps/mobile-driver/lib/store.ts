import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DRIVER_PROFILE_QUERY,
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
  token: string | null;
  pendingPhone: string | null;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  activeDelivery: ActiveDelivery | null;
  pendingRequest: DeliveryRequest | null;

  sendLoginCode: (phone: string) => Promise<boolean>;
  registerAndSendCode: (ownerName: string, phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
  toggleOnline: () => Promise<void>;
  acceptDelivery: (request: DeliveryRequest) => void;
  rejectDelivery: () => void;
  completeDelivery: () => void;
  clearError: () => void;
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
    emailAddress: driver.emailAddress ?? '',
    vehiclePlate: driver.vehiclePlate ?? 'Бүртгээгүй',
    vehicleModel: driver.vehicleModel ?? 'Бүртгээгүй',
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').slice(0, 8);
}

function isValidPhone(phone: string) {
  return /^[6789]\d{7}$/.test(phone);
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
      token: null,
      pendingPhone: null,
      isOnline: false,
      isLoading: false,
      error: null,
      activeDelivery: null,
      pendingRequest: null,

      sendLoginCode: async (phoneInput) => {
        const phone = normalizePhone(phoneInput);
        if (!isValidPhone(phone)) {
          set({ error: 'Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой' });
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{
            loginDriver: { success: boolean; message: string; phone: string | null };
          }>(LOGIN_DRIVER_MUTATION, { phone });
          if (!data.loginDriver.success) {
            set({ isLoading: false, error: data.loginDriver.message });
            return false;
          }
          set({ isLoading: false, pendingPhone: phone, error: null });
          return true;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Код илгээхэд алдаа гарлаа';
          set({ isLoading: false, error: message });
          return false;
        }
      },

      registerAndSendCode: async (ownerNameInput, phoneInput) => {
        const ownerName = ownerNameInput.trim();
        const phone = normalizePhone(phoneInput);
        if (ownerName.length < 2) {
          set({ error: 'Овог нэр 2-оос дээш тэмдэгттэй байх ёстой' });
          return false;
        }
        if (!isValidPhone(phone)) {
          set({ error: 'Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой' });
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{
            registerDriver: { success: boolean; message: string; phone: string | null };
          }>(REGISTER_DRIVER_MUTATION, { input: { ownerName, phone } });
          if (!data.registerDriver.success) {
            set({ isLoading: false, error: data.registerDriver.message });
            return false;
          }
          set({ isLoading: false, pendingPhone: phone, error: null });
          return true;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Бүртгэл үүсгэхэд алдаа гарлаа';
          set({ isLoading: false, error: message });
          return false;
        }
      },

      verifyOtp: async (phoneInput, otp) => {
        const phone = normalizePhone(phoneInput);
        if (!isValidPhone(phone)) {
          set({ error: 'Утасны дугаар буруу байна' });
          return false;
        }
        if (!/^\d{4}$/.test(otp.trim())) {
          set({ error: '4 оронтой код оруулна уу' });
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          const auth = await shopFetch<{
            verifyDriverOTP: { success: boolean; message: string; driverId: string | null; token: string | null };
          }>(VERIFY_DRIVER_OTP_MUTATION, { phone, otp: otp.trim() });
          if (!auth.verifyDriverOTP.success || !auth.verifyDriverOTP.driverId) {
            set({ isLoading: false, error: auth.verifyDriverOTP.message });
            return false;
          }

          const profile = await shopFetch<DriverProfileResponse>(DRIVER_PROFILE_QUERY, {
            id: auth.verifyDriverOTP.driverId,
          });
          if (!profile.getDriverProfile) {
            set({ isLoading: false, error: 'Жолоочийн мэдээлэл олдсонгүй' });
            return false;
          }
          set({
            driver: normalizeDbDriver(profile.getDriverProfile),
            token: auth.verifyDriverOTP.token ?? null,
            pendingPhone: null,
            isOnline: profile.getDriverProfile.isOnline ?? false,
            isLoading: false,
            error: null,
          });
          return true;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Код баталгаажуулахад алдаа гарлаа';
          set({ isLoading: false, error: message });
          return false;
        }
      },

      logout: () => {
        shopFetch(LOGOUT_MUTATION).catch(() => {});
        if (pendingRequestTimer) {
          clearTimeout(pendingRequestTimer);
          pendingRequestTimer = null;
        }
        set({ driver: null, token: null, pendingPhone: null, isOnline: false, activeDelivery: null, pendingRequest: null, error: null });
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
      partialize: (s) => ({ driver: s.driver, token: s.token }),
    },
  ),
);
