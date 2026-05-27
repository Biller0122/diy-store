import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shopFetch, LOGIN_MUTATION, ACTIVE_CUSTOMER_QUERY, LOGOUT_MUTATION } from './api';

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phone: string;
  vehicleType: 'MOTORCYCLE' | 'CAR' | 'VAN';
  vehiclePlate: string;
  vehicleModel: string;
  rating: number;
  totalDeliveries: number;
  todayEarnings: number;
  totalEarnings: number;
}

export interface ActiveDelivery {
  id: string;
  orderId: string;
  customerName: string;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  fee: number;
  distance: number;
  status: string;
}

interface DriverStore {
  driver: Driver | null;
  token: string | null;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  activeDelivery: ActiveDelivery | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  toggleOnline: () => void;
  clearError: () => void;
}

const ERROR_MAP: Record<string, string> = {
  INVALID_CREDENTIALS_ERROR: 'И-мэйл эсвэл нууц үг буруу байна',
  NOT_VERIFIED_ERROR: 'И-мэйл баталгаажаагүй байна',
  NATIVE_AUTH_STRATEGY_ERROR: 'Нэвтрэх боломжгүй байна',
};

// Mock driver profile merged on top of the Vendure customer record
function buildDriver(customer: { id: string; firstName: string; lastName: string; emailAddress: string; phoneNumber?: string }): Driver {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    emailAddress: customer.emailAddress,
    phone: customer.phoneNumber ?? '',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: '1234-УБА',
    vehicleModel: 'Honda CB150',
    rating: 4.9,
    totalDeliveries: 128,
    todayEarnings: 45000,
    totalEarnings: 3200000,
  };
}

export const useDriverStore = create<DriverStore>()(
  persist(
    (set, get) => ({
      driver: null,
      token: null,
      isOnline: false,
      isLoading: false,
      error: null,
      activeDelivery: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{ login: any }>(LOGIN_MUTATION, {
            username: email,
            password,
          });
          const result = data.login;
          if (!result.id) {
            const code = result.errorCode as string | undefined;
            const msg = (code && ERROR_MAP[code]) ?? result.message ?? 'Нэвтрэхэд алдаа гарлаа';
            set({ isLoading: false, error: msg });
            return false;
          }

          const me = await shopFetch<{ activeCustomer: any }>(ACTIVE_CUSTOMER_QUERY);
          if (!me.activeCustomer) {
            set({ isLoading: false, error: 'Хэрэглэгчийн мэдээлэл олдсонгүй' });
            return false;
          }
          set({ driver: buildDriver(me.activeCustomer), isLoading: false });
          return true;
        } catch (err: any) {
          set({ isLoading: false, error: err?.message ?? 'Сүлжээний алдаа' });
          return false;
        }
      },

      logout: async () => {
        try { await shopFetch(LOGOUT_MUTATION, {}, get().token); } catch { /* ignore */ }
        set({ driver: null, token: null, isOnline: false, activeDelivery: null });
      },

      toggleOnline: () => set((s) => ({ isOnline: !s.isOnline })),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'diy-driver-mobile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ driver: s.driver, token: s.token }),
    },
  ),
);
