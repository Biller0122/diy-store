'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  identifier: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AdminState {
  admin: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const ADMIN_API = process.env.NEXT_PUBLIC_VENDURE_ADMIN_API ?? 'http://localhost:3001/admin-api';

async function adminFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ADMIN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    credentials: 'include',
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'Admin API error');
  return json.data as T;
}

const ADMIN_LOGIN = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password, rememberMe: true) {
      ... on CurrentUser {
        id
        identifier
        channels { id code permissions }
      }
      ... on InvalidCredentialsError { message }
      ... on NativeAuthStrategyError { message }
    }
  }
`;

const ADMIN_LOGOUT = `mutation Logout { logout { success } }`;

async function createAdminSession() {
  await fetch('/api/admin/session', { method: 'POST' });
}

function clearAdminSession() {
  void fetch('/api/admin/session', { method: 'DELETE' });
  document.cookie = 'diy-admin=; path=/; max-age=0';
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      admin: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          // Mock mode: accept superadmin/superadmin for local dev
          if (process.env.NODE_ENV === 'development' &&
              (username === 'superadmin' || username === 'admin')) {
            const mockAdmin: AdminUser = {
              id: 'admin-1',
              identifier: username,
              firstName: 'Систем',
              lastName: 'Админ',
              role: 'SuperAdmin',
            };
            set({ admin: mockAdmin, isLoading: false });
            await createAdminSession();
            return true;
          }

          const data = await adminFetch<{ login: any }>(ADMIN_LOGIN, { username, password });
          const result = data.login;
          if (result.id) {
            const admin: AdminUser = {
              id: result.id,
              identifier: result.identifier,
              firstName: result.identifier,
              lastName: '',
              role: 'Admin',
            };
            set({ admin, isLoading: false });
            await createAdminSession();
            return true;
          }
          set({ isLoading: false, error: result.message ?? 'Нэвтрэхэд алдаа гарлаа' });
          return false;
        } catch (err: any) {
          // Dev fallback: allow any login if admin API is down
          if (process.env.NODE_ENV === 'development') {
            const mockAdmin: AdminUser = { id: 'admin-1', identifier: username, firstName: 'Систем', lastName: 'Админ', role: 'SuperAdmin' };
            set({ admin: mockAdmin, isLoading: false });
            await createAdminSession();
            return true;
          }
          set({ isLoading: false, error: 'Сүлжээний алдаа — дараа оролдоно уу' });
          return false;
        }
      },

      logout: () => {
        set({ admin: null, token: null });
        clearAdminSession();
        try { adminFetch(ADMIN_LOGOUT); } catch { /* ignore */ }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'diy-admin-auth',
      partialize: (s) => ({ admin: s.admin, token: s.token }),
    },
  ),
);
