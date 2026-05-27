'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { vendureShopFetch } from './vendure';

export type DriverStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';

export interface DriverUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  vehiclePlate: string;
  vehicleModel: string;
  status: DriverStatus;
  isOnline: boolean;
  rating: number;
  totalDeliveries: number;
  todayEarnings: number;
  totalEarnings: number;
  bankAccount?: string;
  bankName?: string;
}

export interface ActiveDelivery {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  pickupStops: {
    supplierId: string;
    supplierName: string;
    address: string;
    lat: number;
    lng: number;
    status: 'PENDING' | 'ARRIVED' | 'PICKED_UP';
  }[];
  distance: number;
  estimatedDuration: number;
  fee: number;
  status: string;
}

interface DriverState {
  driver: DriverUser | null;
  isOnline: boolean;
  activeDelivery: ActiveDelivery | null;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;
  devOtp: string | null;
  register: (input: DriverRegisterInput) => Promise<boolean>;
  requestLoginOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
  setDriver: (driver: DriverUser) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setStatus: (status: 'OFFLINE' | 'ONLINE' | 'BUSY') => void;
  setActiveDelivery: (delivery: ActiveDelivery | null) => void;
  clearError: () => void;
}

export interface DriverRegisterInput {
  ownerName: string;
  phone: string;
  vehicleType?: DriverUser['vehicleType'];
  vehiclePlate?: string;
  vehicleModel?: string;
  bankName?: string;
  bankAccount?: string;
}

const DEV_OTP = '1234';

const REGISTER_DRIVER_MUTATION = `
  mutation RegisterDriver($input: RegisterDriverInput!) {
    registerDriver(input: $input) {
      success
      message
      phone
    }
  }
`;

const LOGIN_DRIVER_MUTATION = `
  mutation LoginDriver($phone: String!) {
    loginDriver(phone: $phone) {
      success
      message
      phone
    }
  }
`;

const VERIFY_DRIVER_OTP_MUTATION = `
  mutation VerifyDriverOTP($phone: String!, $otp: String!) {
    verifyDriverOTP(phone: $phone, otp: $otp) {
      success
      message
      driverId
      token
    }
  }
`;

const DRIVER_QUERY = `
  query Driver($id: ID!) {
    driver(id: $id) {
      id
      firstName
      lastName
      phone
      vehicleType
      vehiclePlate
      vehicleModel
      status
      isOnline
      rating
      totalDeliveries
      todayEarnings
      totalEarnings
      bankName
      bankAccount
    }
  }
`;

// Offline fallback — used only when server (localhost:3001) is unreachable
// IDs match DB auto-increment from fresh SQLite: 1, 2, 3
const MOCK_DRIVERS: Record<string, DriverUser> = {
  '88112233': {
    id: '1',
    firstName: 'Нарантуяа',
    lastName: 'Болд',
    phone: '88112233',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: '1234-УБА',
    vehicleModel: 'Honda CB150R',
    status: 'ACTIVE',
    isOnline: false,
    rating: 5,
    totalDeliveries: 0,
    todayEarnings: 0,
    totalEarnings: 0,
    bankName: 'Хаан банк',
    bankAccount: '5030001122',
  },
  '88224466': {
    id: '2',
    firstName: 'Ганболд',
    lastName: 'Мөнхбат',
    phone: '88224466',
    vehicleType: 'CAR',
    vehiclePlate: '5678-УВА',
    vehicleModel: 'Toyota Prius 2020',
    status: 'ACTIVE',
    isOnline: false,
    rating: 5,
    totalDeliveries: 0,
    todayEarnings: 0,
    totalEarnings: 0,
    bankName: 'Хас банк',
    bankAccount: '5012244660',
  },
  '88336699': {
    id: '3',
    firstName: 'Мөнхцэцэг',
    lastName: 'Дорж',
    phone: '88336699',
    vehicleType: 'VAN',
    vehiclePlate: '9012-УВА',
    vehicleModel: 'Hyundai H1',
    status: 'ACTIVE',
    isOnline: false,
    rating: 5,
    totalDeliveries: 0,
    todayEarnings: 0,
    totalEarnings: 0,
    bankName: 'Голомт банк',
    bankAccount: '1300336699',
  },
};

const DRIVER_REGISTRY_KEY = 'diy-driver-registry-v2';

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').slice(-8);
}

function getDriverRegistry() {
  if (typeof window === 'undefined') return { ...MOCK_DRIVERS };
  try {
    const saved = window.localStorage.getItem(DRIVER_REGISTRY_KEY);
    return {
      ...MOCK_DRIVERS,
      ...(saved ? JSON.parse(saved) as Record<string, DriverUser> : {}),
    };
  } catch {
    return { ...MOCK_DRIVERS };
  }
}

function saveDriverToRegistry(driver: DriverUser) {
  if (typeof window === 'undefined') return;
  try {
    const current = getDriverRegistry();
    current[driver.phone] = driver;
    window.localStorage.setItem(DRIVER_REGISTRY_KEY, JSON.stringify(current));
  } catch {
    // Storage failures should not block the OTP demo flow.
  }
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError || String(error).toLowerCase().includes('failed to fetch');
}

async function loadDriverFromApi(id: string): Promise<DriverUser | null> {
  const data = await vendureShopFetch<{ driver: DriverUser | null }>(DRIVER_QUERY, { id });
  return data.driver;
}

function splitName(ownerName: string) {
  const parts = ownerName.trim().split(/\s+/);
  return {
    firstName: parts[0] || ownerName.trim(),
    lastName: parts.slice(1).join(' '),
  };
}

function setDriverCookies(driver: DriverUser | null) {
  if (typeof document === 'undefined') return;
  if (!driver) {
    document.cookie = 'diy-driver=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'diy-driver-status=; path=/; max-age=0; SameSite=Lax';
    return;
  }
  document.cookie = `diy-driver=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  document.cookie = `diy-driver-status=${driver.status}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export const useDriverStore = create<DriverState>()(
  persist(
    (set, get) => ({
      driver: null,
      isOnline: false,
      activeDelivery: null,
      isLoading: false,
      hasHydrated: false,
      error: null,
      devOtp: null,

      register: async (input) => {
        set({ isLoading: true, error: null });

        const phone = normalizePhone(input.phone);
        if (input.ownerName.trim().length < 2 || phone.length !== 8) {
          set({ isLoading: false, error: 'Мэдээллээ зөв оруулна уу.' });
          return false;
        }

        try {
          const data = await vendureShopFetch<{
            registerDriver: { success: boolean; message: string; phone?: string | null };
          }>(REGISTER_DRIVER_MUTATION, {
            input: {
              ...input,
              phone,
              ownerName: input.ownerName.trim(),
            },
          });

          if (!data.registerDriver.success) {
            set({ isLoading: false, error: data.registerDriver.message, devOtp: null });
            return false;
          }

          set({ isLoading: false, devOtp: null });
          return true;
        } catch (err) {
          if (!(process.env.NODE_ENV === 'development' && isNetworkError(err))) {
            set({ isLoading: false, error: err instanceof Error ? err.message : 'Бүртгэл илгээхэд алдаа гарлаа' });
            return false;
          }

          const registry = getDriverRegistry();
          if (registry[phone]) {
            set({ isLoading: false, error: 'Энэ дугаар бүртгэлтэй байна.' });
            return false;
          }

          const { firstName, lastName } = splitName(input.ownerName);
          const driver: DriverUser = {
            id: `drv-${Date.now()}`,
            firstName,
            lastName,
            phone,
            vehicleType: input.vehicleType || 'MOTORCYCLE',
            vehiclePlate: input.vehiclePlate || '',
            vehicleModel: input.vehicleModel || '',
            bankName: input.bankName,
            bankAccount: input.bankAccount,
            status: 'PENDING_VERIFICATION',
            isOnline: false,
            rating: 5,
            totalDeliveries: 0,
            todayEarnings: 0,
            totalEarnings: 0,
          };
          saveDriverToRegistry(driver);
          console.log(`[Driver OTP] ${phone}: ${DEV_OTP}`);
          set({ isLoading: false, devOtp: DEV_OTP });
          return true;
        }
      },

      requestLoginOtp: async (phoneInput) => {
        set({ isLoading: true, error: null });
        const phone = normalizePhone(phoneInput);
        try {
          const data = await vendureShopFetch<{
            loginDriver: { success: boolean; message: string; phone?: string | null };
          }>(LOGIN_DRIVER_MUTATION, { phone });

          if (!data.loginDriver.success) {
            set({ isLoading: false, error: data.loginDriver.message, devOtp: null });
            return false;
          }

          set({ isLoading: false, devOtp: null });
          return true;
        } catch (err) {
          if (process.env.NODE_ENV === 'development' && isNetworkError(err)) {
            const found = getDriverRegistry()[phone];
            if (!found) {
              set({ isLoading: false, error: 'Энэ дугаартай жолооч бүртгэлгүй байна.' });
              return false;
            }
            if (found.status === 'SUSPENDED') {
              set({ isLoading: false, error: 'Таны данс түр хаагдсан байна. Тусламж: 7700-XXXX' });
              return false;
            }
            console.log(`[Driver Login OTP] ${phone}: ${DEV_OTP}`);
            set({ isLoading: false, devOtp: DEV_OTP });
            return true;
          }

          set({ isLoading: false, error: err instanceof Error ? err.message : 'Код илгээхэд алдаа гарлаа' });
          return false;
        }
      },

      verifyOtp: async (phoneInput, otp) => {
        set({ isLoading: true, error: null });
        const phone = normalizePhone(phoneInput);
        try {
          const data = await vendureShopFetch<{
            verifyDriverOTP: { success: boolean; message: string; driverId?: string | null };
          }>(VERIFY_DRIVER_OTP_MUTATION, { phone, otp });

          if (!data.verifyDriverOTP.success || !data.verifyDriverOTP.driverId) {
            set({ isLoading: false, error: data.verifyDriverOTP.message });
            return false;
          }

          const driver = await loadDriverFromApi(data.verifyDriverOTP.driverId);
          if (!driver) {
            set({ isLoading: false, error: 'Жолоочийн мэдээлэл олдсонгүй' });
            return false;
          }

          setDriverCookies(driver);
          set({ driver, isOnline: driver.isOnline, isLoading: false, devOtp: null });
          return true;
        } catch (err) {
          if (!(process.env.NODE_ENV === 'development' && isNetworkError(err))) {
            set({ isLoading: false, error: err instanceof Error ? err.message : 'Код шалгахад алдаа гарлаа' });
            return false;
          }

          const found = getDriverRegistry()[phone];
          if (!found || otp !== DEV_OTP) {
            set({ isLoading: false, error: 'Код буруу байна. Дахин оролдоно уу.' });
            return false;
          }
          const nextDriver: DriverUser = {
            ...found,
            status: found.status === 'PENDING_VERIFICATION' ? 'PENDING_APPROVAL' : found.status,
            isOnline: false,
          };
          saveDriverToRegistry(nextDriver);
          setDriverCookies(nextDriver);
          set({ driver: nextDriver, isOnline: false, isLoading: false, devOtp: null });
          return true;
        }
      },

      logout: () => {
        setDriverCookies(null);
        set({ driver: null, activeDelivery: null, isOnline: false });
      },

      setDriver: (driver) => {
        setDriverCookies(driver);
        set({ driver, isOnline: driver.isOnline });
      },

      setOnlineStatus: (isOnline) =>
        set((state) => {
          const driver = state.driver ? { ...state.driver, isOnline } : null;
          if (driver) setDriverCookies(driver);
          return { driver, isOnline };
        }),

      setStatus: (status) => get().setOnlineStatus(status === 'ONLINE' || status === 'BUSY'),

      setActiveDelivery: (delivery) => set({ activeDelivery: delivery }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'diy-driver-auth-v2',
      partialize: (state) => ({
        driver: state.driver,
        isOnline: state.isOnline,
        activeDelivery: state.activeDelivery,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.driver) setDriverCookies(state.driver);
        if (state) state.hasHydrated = true;
      },
    },
  ),
);

export const VEHICLE_LABEL: Record<string, string> = {
  MOTORCYCLE: 'Мотоцикл',
  CAR: 'Машин',
  VAN: 'Фургон',
  TRUCK: 'Ачааны машин',
};
