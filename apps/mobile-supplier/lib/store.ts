import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LOGIN_SUPPLIER_MUTATION,
  REGISTER_SUPPLIER_MUTATION,
  SUPPLIER_QUERY,
  VERIFY_SUPPLIER_OTP_MUTATION,
  shopFetch,
} from './api';

interface Supplier {
  id: string;
  ownerName: string;
  businessName: string;
  description?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  status: string;
  bankName?: string | null;
  bankAccount?: string | null;
  productCount?: number;
  rating?: number;
}

interface SupplierState {
  supplier: Supplier | null;
  token: string | null;
  pendingEmail: string | null;
  pendingOtp: string | null;
  isLoading: boolean;
  error: string | null;
  sendLoginCode: (email: string) => Promise<boolean>;
  registerAndSendCode: (ownerName: string, email: string) => Promise<boolean>;
  verifyEmailOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => void;
  setSupplier: (supplier: Supplier) => void;
  clearError: () => void;
  hydrate: () => Promise<void>;
}

type SupplierRegistrationResult = {
  success: boolean;
  message: string;
  email?: string | null;
  otp?: string | null;
};

type SupplierOtpResult = {
  success: boolean;
  message: string;
  supplierId?: string | null;
  token?: string | null;
};

const STORAGE_KEY = 'diy_supplier_auth';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function loadSupplier(id: string, token?: string | null) {
  const data = await shopFetch<{ supplier: Supplier | null }>(SUPPLIER_QUERY, { id }, token);
  return data.supplier;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  supplier: null,
  token: null,
  pendingEmail: null,
  pendingOtp: null,
  isLoading: false,
  error: null,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { supplier: Supplier; token: string };
        set({ supplier: parsed.supplier, token: parsed.token });
      }
    } catch {
      // ignore broken local cache
    }
  },

  sendLoginCode: async (emailInput: string) => {
    const email = normalizeEmail(emailInput);
    if (!isValidEmail(email)) {
      set({ error: 'И-мэйл хаяг буруу байна' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await shopFetch<{ loginSupplier: SupplierRegistrationResult }>(
        LOGIN_SUPPLIER_MUTATION,
        { email },
      );
      if (!data.loginSupplier.success) {
        set({ isLoading: false, error: data.loginSupplier.message });
        return false;
      }
      set({ isLoading: false, pendingEmail: email, pendingOtp: data.loginSupplier.otp ?? null, error: null });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'И-мэйл код илгээхэд алдаа гарлаа';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  registerAndSendCode: async (ownerNameInput: string, emailInput: string) => {
    const ownerName = ownerNameInput.trim();
    const email = normalizeEmail(emailInput);
    if (ownerName.length < 2) {
      set({ error: 'Овог нэр 2-оос дээш тэмдэгттэй байх ёстой' });
      return false;
    }
    if (!isValidEmail(email)) {
      set({ error: 'И-мэйл хаяг буруу байна' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await shopFetch<{ registerSupplier: SupplierRegistrationResult }>(
        REGISTER_SUPPLIER_MUTATION,
        { input: { ownerName, email } },
      );
      if (!data.registerSupplier.success) {
        set({ isLoading: false, error: data.registerSupplier.message });
        return false;
      }
      set({ isLoading: false, pendingEmail: email, pendingOtp: data.registerSupplier.otp ?? null, error: null });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Бүртгэл үүсгэхэд алдаа гарлаа';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  verifyEmailOtp: async (emailInput: string, otp: string) => {
    const email = normalizeEmail(emailInput);
    if (!/^\d{4}$/.test(otp)) {
      set({ error: '4 оронтой код оруулна уу' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await shopFetch<{ verifySupplierOTP: SupplierOtpResult }>(
        VERIFY_SUPPLIER_OTP_MUTATION,
        { input: { email, otp } },
      );
      if (!data.verifySupplierOTP.success || !data.verifySupplierOTP.supplierId) {
        set({ isLoading: false, error: data.verifySupplierOTP.message });
        return false;
      }

      const supplier = await loadSupplier(data.verifySupplierOTP.supplierId, data.verifySupplierOTP.token);
      if (!supplier) {
        set({ isLoading: false, error: 'Нийлүүлэгчийн мэдээлэл олдсонгүй' });
        return false;
      }

      const token = data.verifySupplierOTP.token ?? '';
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ supplier, token }));
      set({ supplier, token, pendingEmail: null, pendingOtp: null, isLoading: false, error: null });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Код баталгаажуулахад алдаа гарлаа';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ supplier: null, token: null, pendingEmail: null, pendingOtp: null, error: null });
  },

  setSupplier: (supplier) => {
    const token = get().token ?? '';
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ supplier, token })).catch((error) => {
      console.warn('[supplier-store] supplier cache update failed', error);
    });
    set({ supplier });
  },

  clearError: () => set({ error: null }),
}));
