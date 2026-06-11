'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearVendureAuthToken, setVendureAuthToken, vendureShopFetch } from './vendure';

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
  login: (identifier: string, password: string) => Promise<boolean>;
  requestEmailOtp: (email: string) => Promise<{ ok: boolean; otp?: string | null }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<boolean>;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  requestPasswordResetOtp: (email: string) => Promise<{ ok: boolean; otp?: string | null }>;
  resetPasswordWithOtp: (email: string, otp: string, password: string) => Promise<boolean>;
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

const PASSWORD_LOGIN_MUTATION = `
  mutation CustomerPasswordLogin($identifier: String!, $password: String!) {
    customerPasswordLogin(identifier: $identifier, password: $password) {
      success
      message
      token
      customer {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
      }
    }
  }
`;

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS_ERROR: 'И-мэйл/утас эсвэл нууц үг буруу байна',
  NOT_VERIFIED_ERROR: 'И-мэйл баталгаажаагүй байна. Имэйлээ шалгана уу.',
  NATIVE_AUTH_STRATEGY_ERROR: 'Нэвтрэх боломжгүй байна. Дахин оролдоно уу.',
};

const REGISTER_MUTATION = `
  mutation CustomerPasswordRegister($input: CustomerPasswordRegisterInput!) {
    customerPasswordRegister(input: $input) {
      success
      message
      token
      customer {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
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

const CUSTOMER_AUTH_FIELDS = `
  success
  message
  token
  customer {
    id
    firstName
    lastName
    emailAddress
    phoneNumber
  }
`;

const REQUEST_EMAIL_OTP_MUTATION = `
  mutation RequestCustomerEmailOtp($emailAddress: String!) {
    requestCustomerEmailOtp(emailAddress: $emailAddress) {
      success
      message
      otp
    }
  }
`;

const VERIFY_EMAIL_OTP_MUTATION = `
  mutation VerifyCustomerEmailOtp($emailAddress: String!, $otp: String!) {
    verifyCustomerEmailOtp(emailAddress: $emailAddress, otp: $otp) {
      ${CUSTOMER_AUTH_FIELDS}
    }
  }
`;

const GOOGLE_LOGIN_MUTATION = `
  mutation CustomerGoogleLogin($credential: String!) {
    customerGoogleLogin(credential: $credential) {
      ${CUSTOMER_AUTH_FIELDS}
    }
  }
`;

const REQUEST_PASSWORD_RESET_OTP_MUTATION = `
  mutation RequestCustomerPasswordResetOtp($emailAddress: String!) {
    requestCustomerPasswordResetOtp(emailAddress: $emailAddress) {
      success
      message
      otp
    }
  }
`;

const RESET_PASSWORD_WITH_OTP_MUTATION = `
  mutation ResetCustomerPasswordWithOtp($emailAddress: String!, $otp: String!, $password: String!) {
    resetCustomerPasswordWithOtp(emailAddress: $emailAddress, otp: $otp, password: $password) {
      ${CUSTOMER_AUTH_FIELDS}
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

async function createCustomerSession() {
  await fetch('/api/account/session', { method: 'POST' });
}

async function applyCustomerAuth(result: { success?: boolean; message?: string; token?: string | null; customer?: ActiveCustomer | null }, set: (state: Partial<AuthState>) => void) {
  if (!result.success || !result.token || !result.customer) {
    set({ isLoading: false, error: result.message ?? 'Нэвтрэхэд алдаа гарлаа' });
    return false;
  }
  setVendureAuthToken(result.token);
  set({ customer: result.customer, token: result.token, isLoading: false, error: null });
  await createCustomerSession();
  return true;
}

function clearCustomerSession() {
  void fetch('/api/account/session', { method: 'DELETE' });
  document.cookie = 'diy-auth=; path=/; max-age=0';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (identifier, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await vendureShopFetch<{
            customerPasswordLogin: { success?: boolean; message?: string; token?: string | null; customer?: ActiveCustomer | null };
          }>(PASSWORD_LOGIN_MUTATION, { identifier, password });

          const result = data.customerPasswordLogin;
          if (result.success && result.customer) {
            if (result.token) setVendureAuthToken(result.token);
            set({ customer: result.customer, token: result.token ?? null, isLoading: false, error: null });
            await createCustomerSession();
            return true;
          } else {
            const errorCode = (result as any).errorCode as string | undefined;
            const msg = (errorCode && LOGIN_ERROR_MESSAGES[errorCode]) ?? result.message ?? 'Нэвтрэхэд алдаа гарлаа';
            set({ isLoading: false, error: msg });
            return false;
          }
        } catch (err: unknown) {
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Сүлжээний алдаа' });
          return false;
        }
      },

      requestEmailOtp: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const data = await vendureShopFetch<{
            requestCustomerEmailOtp: { success: boolean; message: string; otp?: string | null };
          }>(REQUEST_EMAIL_OTP_MUTATION, { emailAddress: email });
          set({ isLoading: false, error: data.requestCustomerEmailOtp.success ? null : data.requestCustomerEmailOtp.message });
          return { ok: data.requestCustomerEmailOtp.success, otp: data.requestCustomerEmailOtp.otp };
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Сүлжээний алдаа' });
          return { ok: false };
        }
      },

      verifyEmailOtp: async (email, otp) => {
        set({ isLoading: true, error: null });
        try {
          const data = await vendureShopFetch<{
            verifyCustomerEmailOtp: { success: boolean; message: string; token?: string | null; customer?: ActiveCustomer | null };
          }>(VERIFY_EMAIL_OTP_MUTATION, { emailAddress: email, otp });
          return applyCustomerAuth(data.verifyCustomerEmailOtp, set);
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Сүлжээний алдаа' });
          return false;
        }
      },

      loginWithGoogle: async (credential) => {
        set({ isLoading: true, error: null });
        try {
          const data = await vendureShopFetch<{
            customerGoogleLogin: { success: boolean; message: string; token?: string | null; customer?: ActiveCustomer | null };
          }>(GOOGLE_LOGIN_MUTATION, { credential });
          return applyCustomerAuth(data.customerGoogleLogin, set);
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Google нэвтрэлт амжилтгүй боллоо' });
          return false;
        }
      },

      requestPasswordResetOtp: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const data = await vendureShopFetch<{
            requestCustomerPasswordResetOtp: { success: boolean; message: string; otp?: string | null };
          }>(REQUEST_PASSWORD_RESET_OTP_MUTATION, { emailAddress: email });
          set({ isLoading: false, error: data.requestCustomerPasswordResetOtp.success ? null : data.requestCustomerPasswordResetOtp.message });
          return { ok: data.requestCustomerPasswordResetOtp.success, otp: data.requestCustomerPasswordResetOtp.otp };
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Сүлжээний алдаа' });
          return { ok: false };
        }
      },

      resetPasswordWithOtp: async (email, otp, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await vendureShopFetch<{
            resetCustomerPasswordWithOtp: { success: boolean; message: string; token?: string | null; customer?: ActiveCustomer | null };
          }>(RESET_PASSWORD_WITH_OTP_MUTATION, { emailAddress: email, otp, password });
          return applyCustomerAuth(data.resetCustomerPasswordWithOtp, set);
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Нууц үг сэргээхэд алдаа гарлаа' });
          return false;
        }
      },

      register: async (input) => {
        set({ isLoading: true, error: null });
        try {
          const data = await vendureShopFetch<{
            customerPasswordRegister: { success?: boolean; message?: string; token?: string | null; customer?: ActiveCustomer | null };
          }>(REGISTER_MUTATION, { input });

          return applyCustomerAuth(data.customerPasswordRegister, set);
        } catch (err: unknown) {
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
        clearVendureAuthToken();
        clearCustomerSession();
      },

      fetchActiveCustomer: async () => {
        try {
          const data = await vendureShopFetch<{ activeCustomer: ActiveCustomer | null }>(
            ACTIVE_CUSTOMER_QUERY,
          );
          if (data.activeCustomer) {
            set({ customer: data.activeCustomer });
            await createCustomerSession();
          } else {
            set({ customer: null });
            clearCustomerSession();
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
