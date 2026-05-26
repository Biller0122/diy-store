'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  register: (ownerName: string, phone: string) => Promise<boolean>;
  requestLoginOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setStatus: (status: 'OFFLINE' | 'ONLINE' | 'BUSY') => void;
  setActiveDelivery: (delivery: ActiveDelivery | null) => void;
  clearError: () => void;
}

const DEV_OTP = '1234';

const MOCK_DRIVERS: Record<string, DriverUser> = {
  '88001122': {
    id: 'drv-001',
    firstName: 'Анхбаяр',
    lastName: 'Дамдин',
    phone: '88001122',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: '2345-УБА',
    vehicleModel: 'Honda CB150',
    status: 'ACTIVE',
    isOnline: false,
    rating: 4.9,
    totalDeliveries: 1243,
    todayEarnings: 2450000,
    totalEarnings: 854000000,
    bankName: 'Хаан банк',
    bankAccount: '5030123456',
  },
  // Test account (spec: phone 77009988, status ACTIVE)
  '77009988': {
    id: 'drv-t1',
    firstName: 'Тест',
    lastName: 'Жолооч',
    phone: '77009988',
    vehicleType: 'CAR',
    vehiclePlate: '9988-УБА',
    vehicleModel: 'Toyota Prius',
    status: 'ACTIVE',
    isOnline: false,
    rating: 4.7,
    totalDeliveries: 256,
    todayEarnings: 0,
    totalEarnings: 180000000,
    bankName: 'Хас банк',
    bankAccount: '5011223344',
  },
};

const DRIVER_REGISTRY_KEY = 'diy-driver-registry';

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

      register: async (ownerName, phoneInput) => {
        set({ isLoading: true, error: null });
        await new Promise((resolve) => setTimeout(resolve, 500));

        const phone = normalizePhone(phoneInput);
        if (ownerName.trim().length < 2 || phone.length !== 8) {
          set({ isLoading: false, error: 'Мэдээллээ зөв оруулна уу.' });
          return false;
        }

        const registry = getDriverRegistry();
        if (registry[phone]) {
          set({ isLoading: false, error: 'Энэ дугаар бүртгэлтэй байна.' });
          return false;
        }

        const { firstName, lastName } = splitName(ownerName);
        const driver: DriverUser = {
          id: `drv-${Date.now()}`,
          firstName,
          lastName,
          phone,
          vehicleType: 'MOTORCYCLE',
          vehiclePlate: '',
          vehicleModel: '',
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
      },

      requestLoginOtp: async (phoneInput) => {
        set({ isLoading: true, error: null });
        await new Promise((resolve) => setTimeout(resolve, 500));
        const phone = normalizePhone(phoneInput);
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
      },

      verifyOtp: async (phoneInput, otp) => {
        set({ isLoading: true, error: null });
        await new Promise((resolve) => setTimeout(resolve, 450));
        const phone = normalizePhone(phoneInput);
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
      },

      logout: () => {
        setDriverCookies(null);
        set({ driver: null, activeDelivery: null, isOnline: false });
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
      name: 'diy-driver-auth',
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
