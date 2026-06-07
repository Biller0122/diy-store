import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getShopSessionToken,
  setShopSessionToken,
  shopFetch,
  LOGIN_MUTATION,
  LOGOUT_MUTATION,
  REGISTER_MUTATION,
  ACTIVE_CUSTOMER_QUERY,
} from './api';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
  addresses?: Array<{
    id: string;
    streetLine1: string;
    city?: string;
    defaultShippingAddress?: boolean;
    defaultBillingAddress?: boolean;
  }>;
}

interface AppState {
  customer: Customer | null;
  token: string | null;
  cartCount: number;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  setCartCount: (count: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      cartCount: 0,
      isLoading: false,
      error: null,

      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{ login: { id?: string; identifier?: string; errorCode?: string; message?: string } }>(
            LOGIN_MUTATION,
            { username: email, password }
          );

          const result = data.login;
          if (result.errorCode) {
            set({ error: result.message || 'Нэвтрэх алдаа гарлаа', isLoading: false });
            return false;
          }

          if (result.id) {
            const token = getShopSessionToken();
            const customerData = await shopFetch<{ activeCustomer: Customer | null }>(
              ACTIVE_CUSTOMER_QUERY,
              undefined,
              token
            );
            set({
              customer: customerData.activeCustomer,
              token,
              isLoading: false,
            });
            return true;
          }

          set({ error: 'Нэвтрэх алдаа гарлаа', isLoading: false });
          return false;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Холболтын алдаа';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      register: async (email: string, password: string, firstName: string, lastName: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{
            registerCustomerAccount: { success?: boolean; errorCode?: string; message?: string };
          }>(REGISTER_MUTATION, {
            input: { emailAddress: email, password, firstName, lastName },
          });

          const result = data.registerCustomerAccount;
          if (result.errorCode) {
            set({ error: result.message || 'Бүртгэлийн алдаа гарлаа', isLoading: false });
            return false;
          }

          if (result.success) {
            set({ isLoading: false });
            return true;
          }

          set({ error: 'Бүртгэлийн алдаа гарлаа', isLoading: false });
          return false;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Холболтын алдаа';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      logout: () => {
        shopFetch(LOGOUT_MUTATION).catch(() => {});
        setShopSessionToken(null);
        set({ customer: null, token: null, cartCount: 0 });
      },

      clearError: () => set({ error: null }),

      setCartCount: (count: number) => set({ cartCount: count }),
    }),
    {
      name: 'diy-store-customer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        customer: state.customer,
        token: state.token,
      }),
    }
  )
);

export const useCartCount = () => useAppStore((s) => s.cartCount);
