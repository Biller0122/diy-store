import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setShopSessionToken,
  shopFetch,
  PASSWORD_LOGIN_MUTATION,
  LOGOUT_MUTATION,
  REGISTER_MUTATION,
  REQUEST_EMAIL_OTP_MUTATION,
  VERIFY_EMAIL_OTP_MUTATION,
  REQUEST_PASSWORD_RESET_OTP_MUTATION,
  RESET_PASSWORD_WITH_OTP_MUTATION,
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

export interface SupplierCartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  image?: string | null;
  price: number;
  qty: number;
  supplierId: string;
  supplierName: string;
  supplierSlug?: string;
  supplierDistrict?: string | null;
  supplierAddress?: string | null;
  supplierPhone?: string | null;
  supplierLat?: number | null;
  supplierLng?: number | null;
}

interface AppState {
  customer: Customer | null;
  token: string | null;
  cartCount: number;
  supplierCart: SupplierCartItem[];
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  requestEmailOtp: (email: string) => Promise<{ ok: boolean; otp?: string | null }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<boolean>;
  requestPasswordResetOtp: (email: string) => Promise<{ ok: boolean; otp?: string | null }>;
  resetPasswordWithOtp: (email: string, otp: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  setCartCount: (count: number) => void;
  addSupplierCartItem: (item: Omit<SupplierCartItem, 'id'>) => void;
  updateSupplierCartQty: (id: string, qty: number) => void;
  removeSupplierCartItem: (id: string) => void;
  clearSupplierCart: () => void;
}

interface RegisterInput {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
  phoneNumber?: string;
}

type CustomerAuthResult = {
  success?: boolean;
  message?: string;
  token?: string | null;
  customer?: Customer | null;
};

function applyCustomerAuth(result: CustomerAuthResult, set: (state: Partial<AppState>) => void) {
  if (!result.success || !result.token || !result.customer) {
    set({ isLoading: false, error: result.message ?? 'Нэвтрэхэд алдаа гарлаа' });
    return false;
  }
  setShopSessionToken(result.token);
  set({ customer: result.customer, token: result.token, isLoading: false, error: null });
  return true;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      cartCount: 0,
      supplierCart: [],
      isLoading: false,
      error: null,

      login: async (identifier: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{ customerPasswordLogin: CustomerAuthResult }>(
            PASSWORD_LOGIN_MUTATION,
            { identifier, password }
          );

          return applyCustomerAuth(data.customerPasswordLogin, set);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Холболтын алдаа';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      requestEmailOtp: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{
            requestCustomerEmailOtp: { success: boolean; message: string; otp?: string | null };
          }>(REQUEST_EMAIL_OTP_MUTATION, { emailAddress: email });
          const result = data.requestCustomerEmailOtp;
          set({ isLoading: false, error: result.success ? null : result.message });
          return { ok: result.success, otp: result.otp };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Сүлжээний алдаа';
          set({ error: msg, isLoading: false });
          return { ok: false };
        }
      },

      verifyEmailOtp: async (email: string, otp: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{ verifyCustomerEmailOtp: CustomerAuthResult }>(
            VERIFY_EMAIL_OTP_MUTATION,
            { emailAddress: email, otp },
          );
          return applyCustomerAuth(data.verifyCustomerEmailOtp, set);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Сүлжээний алдаа';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      requestPasswordResetOtp: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{
            requestCustomerPasswordResetOtp: { success: boolean; message: string; otp?: string | null };
          }>(REQUEST_PASSWORD_RESET_OTP_MUTATION, { emailAddress: email });
          const result = data.requestCustomerPasswordResetOtp;
          set({ isLoading: false, error: result.success ? null : result.message });
          return { ok: result.success, otp: result.otp };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Сүлжээний алдаа';
          set({ error: msg, isLoading: false });
          return { ok: false };
        }
      },

      resetPasswordWithOtp: async (email: string, otp: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{ resetCustomerPasswordWithOtp: CustomerAuthResult }>(
            RESET_PASSWORD_WITH_OTP_MUTATION,
            { emailAddress: email, otp, password },
          );
          return applyCustomerAuth(data.resetCustomerPasswordWithOtp, set);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Нууц үг сэргээхэд алдаа гарлаа';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      register: async (input: RegisterInput): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const data = await shopFetch<{
            customerPasswordRegister: CustomerAuthResult;
          }>(REGISTER_MUTATION, {
            input,
          });

          return applyCustomerAuth(data.customerPasswordRegister, set);
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

      addSupplierCartItem: (item) =>
        set((state) => {
          const existing = state.supplierCart.find(
            (cartItem) => cartItem.variantId === item.variantId && cartItem.supplierId === item.supplierId,
          );
          if (existing) {
            return {
              supplierCart: state.supplierCart.map((cartItem) =>
                cartItem.id === existing.id
                  ? { ...cartItem, qty: cartItem.qty + item.qty }
                  : cartItem,
              ),
            };
          }
          return {
            supplierCart: [
              ...state.supplierCart,
              { ...item, id: `${item.supplierId}-${item.variantId}-${Date.now()}` },
            ],
          };
        }),

      updateSupplierCartQty: (id, qty) => {
        if (qty < 1) return;
        set((state) => ({
          supplierCart: state.supplierCart.map((item) => (item.id === id ? { ...item, qty } : item)),
        }));
      },

      removeSupplierCartItem: (id) =>
        set((state) => ({
          supplierCart: state.supplierCart.filter((item) => item.id !== id),
        })),

      clearSupplierCart: () => set({ supplierCart: [] }),
    }),
    {
      name: 'diy-store-customer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        customer: state.customer,
        token: state.token,
        supplierCart: state.supplierCart,
      }),
      onRehydrateStorage: () => (state) => {
        setShopSessionToken(state?.token ?? null);
      },
    }
  )
);

export const useCartCount = () => useAppStore((s) => s.cartCount);
