'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { vendureShopFetch } from './vendure';

export interface ActiveCustomer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
}

interface AuthState {
  customer: ActiveCustomer | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchActiveCustomer: () => Promise<void>;
  clearError: () => void;
}

interface RegisterInput {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
  phoneNumber?: string;
}

const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {
    login(username: $username, password: $password, rememberMe: $rememberMe) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on InvalidCredentialsError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
    }
  }
`;

const REGISTER_MUTATION = `
  mutation Register($input: RegisterCustomerInput!) {
    registerCustomerAccount(input: $input) {
      ... on Success {
        success
      }
      ... on MissingPasswordError {
        message
      }
      ... on PasswordValidationError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
    }
  }
`;

const LOGOUT_MUTATION = `
  mutation Logout {
    logout {
      success
    }
  }
`;

const ACTIVE_CUSTOMER_QUERY = `
  query ActiveCustomer {
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
      phoneNumber
    }
  }
`;

function createMockCustomer(email: string): ActiveCustomer {
  return {
    id: 'customer-dev-1',
    firstName: 'Туршилтын',
    lastName: 'Хэрэглэгч',
    emailAddress: email,
    phoneNumber: '99112233',
  };
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError || String(error).toLowerCase().includes('failed to fetch');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await vendureShopFetch<{
            login: { id?: string; identifier?: string; message?: string };
          }>(LOGIN_MUTATION, { username: email, password, rememberMe: true });

          const result = data.login;
          if (result.id) {
            // fetch customer details
            await get().fetchActiveCustomer();
            set({ isLoading: false });
            return true;
          } else {
            set({ isLoading: false, error: result.message ?? 'Нэвтрэхэд алдаа гарлаа' });
            return false;
          }
        } catch (err: unknown) {
          if (process.env.NODE_ENV === 'development' && isNetworkError(err)) {
            const customer = createMockCustomer(email);
            set({ customer, isLoading: false, error: null });
            document.cookie = `diy-auth=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
            return true;
          }
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Сүлжээний алдаа' });
          return false;
        }
      },

      register: async (input) => {
        set({ isLoading: true, error: null });
        try {
          const data = await vendureShopFetch<{
            registerCustomerAccount: { success?: boolean; message?: string };
          }>(REGISTER_MUTATION, { input });

          const result = data.registerCustomerAccount;
          if (result.success) {
            set({ isLoading: false });
            return true;
          } else {
            set({ isLoading: false, error: result.message ?? 'Бүртгүүлэхэд алдаа гарлаа' });
            return false;
          }
        } catch (err: unknown) {
          if (process.env.NODE_ENV === 'development' && isNetworkError(err)) {
            set({ isLoading: false, error: null });
            return true;
          }
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Сүлжээний алдаа' });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await vendureShopFetch(LOGOUT_MUTATION);
        } catch {
          // ignore
        }
        set({ customer: null, token: null, isLoading: false });
        // clear the auth cookie
        document.cookie = 'diy-auth=; path=/; max-age=0';
      },

      fetchActiveCustomer: async () => {
        try {
          const data = await vendureShopFetch<{ activeCustomer: ActiveCustomer | null }>(
            ACTIVE_CUSTOMER_QUERY,
          );
          if (data.activeCustomer) {
            set({ customer: data.activeCustomer });
            // set cookie for middleware
            document.cookie = `diy-auth=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
          } else {
            set({ customer: null });
            document.cookie = 'diy-auth=; path=/; max-age=0';
          }
        } catch (err) {
          if (process.env.NODE_ENV === 'development' && isNetworkError(err)) {
            const stored = get().customer;
            if (stored) set({ customer: stored });
            return;
          }
          set({ customer: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'diy-store-auth',
      partialize: (state) => ({ customer: state.customer, token: state.token }),
    },
  ),
);
