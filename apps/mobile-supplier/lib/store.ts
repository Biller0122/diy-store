import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shopFetch, LOGIN_MUTATION, LOGOUT_MUTATION, ACTIVE_CUSTOMER_QUERY } from './api';

interface Supplier {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  businessName: string;
}

interface SupplierState {
  supplier: Supplier | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  hydrate: () => Promise<void>;
}

interface LoginResult {
  login:
    | { id: string; identifier: string }
    | { errorCode: string; message: string };
}

interface ActiveCustomerResult {
  activeCustomer: {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
  } | null;
}

const STORAGE_KEY = 'diy_supplier_auth';

export const useSupplierStore = create<SupplierState>((set, get) => ({
  supplier: null,
  token: null,
  isLoading: false,
  error: null,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ supplier: parsed.supplier, token: parsed.token });
      }
    } catch {
      // ignore
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const loginData = await shopFetch<LoginResult>(LOGIN_MUTATION, {
        username: email,
        password,
      });

      const loginResult = loginData.login;

      if ('errorCode' in loginResult) {
        const code = loginResult.errorCode;
        let msg = 'Нэвтрэхэд алдаа гарлаа.';
        if (code === 'INVALID_CREDENTIALS_ERROR') {
          msg = 'Имэйл эсвэл нууц үг буруу байна.';
        } else if (code === 'NOT_VERIFIED_ERROR') {
          msg = 'Бүртгэл баталгаажаагүй байна.';
        }
        set({ isLoading: false, error: msg });
        return false;
      }

      const token = loginResult.id;

      const customerData = await shopFetch<ActiveCustomerResult>(
        ACTIVE_CUSTOMER_QUERY,
        {},
        token,
      );

      const customer = customerData.activeCustomer;
      if (!customer) {
        set({ isLoading: false, error: 'Хэрэглэгчийн мэдээлэл олдсонгүй.' });
        return false;
      }

      const supplier: Supplier = {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        emailAddress: customer.emailAddress,
        businessName: `${customer.firstName} Дэлгүүр`,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ supplier, token }));
      set({ supplier, token, isLoading: false, error: null });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Сүлжээний алдаа гарлаа.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: async () => {
    const { token } = get();
    try {
      if (token) {
        await shopFetch(LOGOUT_MUTATION, {}, token);
      }
    } catch {
      // ignore logout errors
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ supplier: null, token: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
