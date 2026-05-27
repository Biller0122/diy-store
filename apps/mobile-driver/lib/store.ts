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
  toggleOnline: () => void;
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

const DEMO_DRIVER: Driver = {
  id: 'demo-driver-001',
  firstName: 'Одбаяр',
  lastName: 'Жолооч',
  emailAddress: DEMO_DRIVER_EMAIL,
  phone: '99112233',
  vehicleType: 'MOTORCYCLE',
  vehiclePlate: '7777УБА',
  vehicleModel: 'Honda PCX150',
  rating: 4.8,
  totalDeliveries: 143,
  todayEarnings: 45000,
  totalEarnings: 3200000,
};

function isDemoDriverLogin(email: string, password: string) {
  return email.toLowerCase() === DEMO_DRIVER_EMAIL && password === DEMO_DRIVER_PASSWORD;
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
          set({ driver: DEMO_DRIVER, isLoading: false, error: null });
          return true;
        }

        try {
          const data = await shopFetch<{ login: Record<string, unknown> }>(LOGIN_MUTATION, {
            username: email,
            password,
          });
          const result = data.login;
          if (!result.id) {
            const code = result.errorCode as string | undefined;
            const msg = (code && ERROR_MAP[code]) ?? (result.message as string) ?? 'Нэвтрэхэд алдаа гарлаа';
            set({ isLoading: false, error: msg });
            return false;
          }

          const me = await shopFetch<{ activeCustomer: { id: string; firstName: string; lastName: string; emailAddress: string; phoneNumber?: string } | null }>(
            ACTIVE_CUSTOMER_QUERY,
          );
          if (!me.activeCustomer) {
            set({ isLoading: false, error: 'Хэрэглэгчийн мэдээлэл олдсонгүй' });
            return false;
          }
          set({ driver: buildDriver(me.activeCustomer), isLoading: false });
          return true;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Сүлжээний алдаа';
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
        set({ driver: null, isOnline: false, activeDelivery: null, pendingRequest: null, error: null });
      },

      toggleOnline: () => {
        const { isOnline } = get();
        const newOnline = !isOnline;
        set({ isOnline: newOnline });

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
