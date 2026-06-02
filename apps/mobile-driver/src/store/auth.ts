import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { Driver, getDriverProfile, loginDriver, refreshDriverToken, registerDriver, requestDriverOtp, setAuthToken, updateDriverStatus, verifyDriverOtp } from '../api/client';

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
  devOtp: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  requestLoginOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  updateOnline: (isOnline: boolean) => Promise<boolean>;
  updateVehicle: (vehicleType: Driver['vehicleType'], vehiclePlate: string, vehicleModel: string) => void;
  setDriver: (driver: Driver | null) => void;
  logout: () => void;
  clearError: () => void;
};


function mapLoginError(error: unknown) {
  const text = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (text.includes('suspend') || text.includes('disabled') || text.includes('хаагдсан')) return 'Данс хаагдсан байна. Тусламж: 7700-0000';
  if (text.includes('network') || text.includes('failed') || text.includes('fetch')) return 'Интернэт холболт шалгана уу';
  return 'И-мэйл эсвэл нууц үг буруу байна';
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').slice(-8);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      driver: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      devOtp: null,

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
          set({ driver, token, isAuthenticated: true, isLoading: false, devOtp: null });
          return true;
        } catch (error) {
          set({ isLoading: false, error: mapLoginError(error) });
          return false;
        }
      },

      requestLoginOtp: async (phoneInput) => {
        set({ isLoading: true, error: null });
        const phone = normalizePhone(phoneInput);
        if (!/^\d{8}$/.test(phone)) {
          set({ isLoading: false, error: 'Утасны дугаар 8 оронтой байх ёстой' });
          return false;
        }
        try {
          const data = await requestDriverOtp(phone);
          if (!data.loginDriver.success) {
            set({ isLoading: false, error: data.loginDriver.message, devOtp: null });
            return false;
          }
          set({ isLoading: false, devOtp: data.loginDriver.otp ?? null });
          return true;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Код илгээхэд алдаа гарлаа' });
          return false;
        }
      },

      verifyOtp: async (phoneInput, otp) => {
        set({ isLoading: true, error: null });
        const phone = normalizePhone(phoneInput);
        try {
          const data = await verifyDriverOtp(phone, otp);
          if (!data.verifyDriverOTP.success || !data.verifyDriverOTP.driverId) {
            set({ isLoading: false, error: data.verifyDriverOTP.message });
            return false;
          }
          const token = data.verifyDriverOTP.token ?? null;
          setAuthToken(token);
          const profile = await getDriverProfile(data.verifyDriverOTP.driverId);
          const driver = profile.getDriverProfile;
          if (!driver) {
            set({ isLoading: false, error: 'Жолоочийн мэдээлэл олдсонгүй' });
            return false;
          }
          set({ driver, token, isAuthenticated: true, isLoading: false, devOtp: null });
          return true;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Код шалгахад алдаа гарлаа' });
          return false;
        }
      },

      register: async (input) => {
        set({ isLoading: true, error: null });
        try {
          const payload = {
            ownerName: input.ownerName.trim(),
            email: input.email.trim().toLowerCase(),
            password: input.password,
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

      refreshSession: async () => {
        const { driver, token } = get();
        if (!driver) return false;
        if (token) {
          setAuthToken(token);
          return true;
        }
        try {
          const data = await refreshDriverToken(driver.id, driver.phone);
          const nextToken = data.refreshDriverToken.token ?? null;
          if (!data.refreshDriverToken.success || !nextToken) return false;
          setAuthToken(nextToken);
          set({ token: nextToken });
          return true;
        } catch {
          return false;
        }
      },

      refreshProfile: async () => {
        const { driver } = get();
        if (!driver) return;
        const profile = await getDriverProfile(driver.id);
        if (profile.getDriverProfile) {
          set({ driver: profile.getDriverProfile });
        }
      },

      updateOnline: async (isOnline) => {
        const { driver } = get();
        if (!driver) return false;
        set({ driver: { ...driver, isOnline }, error: null });
        try {
          await get().refreshSession();
          const result = await updateDriverStatus(driver.id, isOnline);
          if (result.setOnlineStatus) {
            set({ driver: { ...driver, isOnline: result.setOnlineStatus.isOnline, status: result.setOnlineStatus.status as Driver['status'] } });
          }
        } catch (error) {
          set({ driver: { ...driver, isOnline: !isOnline }, error: error instanceof Error ? error.message : 'Онлайн төлөв солиход алдаа гарлаа' });
          return false;
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
        set({ driver: null, token: null, isAuthenticated: false, error: null, devOtp: null });
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
