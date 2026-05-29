import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { Driver, getDriverProfile, loginDriver, registerDriver, setAuthToken, updateDriverStatus } from '../api/client';

const secureStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
};

type RegisterInput = {
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  vehicleType: Driver['vehicleType'];
  vehiclePlate: string;
  vehicleModel: string;
};

type AuthState = {
  driver: Driver | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  updateOnline: (isOnline: boolean) => Promise<boolean>;
  updateVehicle: (vehicleType: Driver['vehicleType'], vehiclePlate: string, vehicleModel: string) => void;
  setDriver: (driver: Driver | null) => void;
  logout: () => void;
  clearError: () => void;
};

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] || 'Жолооч', lastName: parts.slice(1).join(' ') || '' };
}

function mapLoginError(error: unknown) {
  const text = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (text.includes('suspend') || text.includes('disabled') || text.includes('хаагдсан')) return 'Данс хаагдсан байна. Тусламж: 7700-0000';
  if (text.includes('network') || text.includes('failed') || text.includes('fetch')) return 'Интернэт холболт шалгана уу';
  return 'И-мэйл эсвэл нууц үг буруу байна';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      driver: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await loginDriver(email.trim(), password);
          if (!data.loginDriverByPassword.success || !data.loginDriverByPassword.driverId) {
            set({ isLoading: false, error: mapLoginError(data.loginDriverByPassword.message) });
            return false;
          }
          const token = data.loginDriverByPassword.token ?? `driver-session-${data.loginDriverByPassword.driverId}`;
          setAuthToken(token);
          const profile = await getDriverProfile(data.loginDriverByPassword.driverId);
          const driver = profile.getDriverProfile;
          if (!driver) {
            set({ isLoading: false, error: 'Жолоочийн мэдээлэл олдсонгүй' });
            return false;
          }
          set({ driver, token, isAuthenticated: true, isLoading: false });
          return true;
        } catch (error) {
          set({ isLoading: false, error: mapLoginError(error) });
          return false;
        }
      },

      register: async (input) => {
        set({ isLoading: true, error: null });
        try {
          const payload = {
            ownerName: input.ownerName.trim(),
            phone: input.phone.replace(/\D/g, '').slice(-8),
            vehicleType: input.vehicleType,
            vehiclePlate: input.vehiclePlate.trim(),
            vehicleModel: input.vehicleModel.trim(),
          };
          const result = await registerDriver(payload);
          if (!result.registerDriver.success) {
            set({ isLoading: false, error: result.registerDriver.message || 'Бүртгэл илгээхэд алдаа гарлаа' });
            return false;
          }
          set({ isLoading: false });
          return true;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Бүртгэл илгээхэд алдаа гарлаа' });
          return false;
        }
      },

      updateOnline: async (isOnline) => {
        const { driver } = get();
        if (!driver) return false;
        set({ driver: { ...driver, isOnline }, error: null });
        try {
          await updateDriverStatus(driver.id, isOnline);
        } catch {
          // Keep optimistic state in development so the driver flow remains testable.
        }
        return true;
      },

      updateVehicle: (vehicleType, vehiclePlate, vehicleModel) => {
        const driver = get().driver;
        if (!driver) return;
        set({ driver: { ...driver, vehicleType, vehiclePlate, vehicleModel } });
      },

      setDriver: (driver) => set({ driver, isAuthenticated: !!driver }),

      logout: () => {
        setAuthToken(null);
        set({ driver: null, token: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'diy-driver-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ driver: state.driver, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    },
  ),
);

export const VEHICLE_LABEL: Record<Driver['vehicleType'], string> = {
  MOTORCYCLE: 'Мотоцикл',
  CAR: 'Автомашин',
  VAN: 'Ван',
  TRUCK: 'Ачааны машин',
};

export function createRegisteredDriver(input: RegisterInput): Driver {
  const name = splitName(input.ownerName);
  return {
    id: `driver-${Date.now()}`,
    firstName: name.firstName,
    lastName: name.lastName,
    phone: '',
    rating: 0,
    totalDeliveries: 0,
    todayEarnings: 0,
    totalEarnings: 0,
    emailAddress: input.email,
    vehicleType: input.vehicleType,
    vehiclePlate: input.vehiclePlate,
    vehicleModel: input.vehicleModel,
    status: 'PENDING_APPROVAL',
    isOnline: false,
  };
}
