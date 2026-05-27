'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SupplierStatus = 'PENDING' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface SupplierUser {
  id: string;
  businessName: string;
  slug: string;
  logo?: string;
  ownerName: string;
  phone: string;
  email: string;
  district?: string;
  status: SupplierStatus;
  commissionRate: number;
  rating: number;
  reviewCount: number;
  productCount?: number;
}

interface SupplierState {
  supplier: SupplierUser | null;
  devOtp: string | null;
  isLoading: boolean;
  error: string | null;
  requestLoginOtp: (email: string) => Promise<boolean>;
  verifyLoginOtp: (email: string, otp: string) => Promise<{ success: boolean; redirectTo?: string }>;
  logout: () => void;
  setSupplier: (supplier: SupplierUser) => void;
  clearError: () => void;
}

const DEV_OTP = '1234';
const SUPPLIER_REGISTRY_KEY = 'diy-supplier-registry';

// Built-in mock suppliers for development/testing
const BUILT_IN_SUPPLIERS: Record<string, SupplierUser> = {
  // Test account (spec: phone 88001122, status ACTIVE)
  '88001122': {
    id: 'sup-t1',
    businessName: 'Ганцоо барилгын материал',
    slug: 'gantso-bariltgiin-material',
    ownerName: 'Ганцоо Батбаяр',
    phone: '88001122',
    email: 'info@gantso.mn',
    district: 'Баянзүрх',
    status: 'ACTIVE',
    commissionRate: 8,
    rating: 4.8,
    reviewCount: 312,
    productCount: 145,
  },
  '99001122': {
    id: 'sup-001',
    businessName: 'БудагМаркет ХХК',
    slug: 'budag-market',
    ownerName: 'Дорж Баатар',
    phone: '99001122',
    email: 'info@budagmarket.mn',
    district: 'Баянзүрх',
    status: 'ACTIVE',
    commissionRate: 10,
    rating: 4.7,
    reviewCount: 234,
    productCount: 210,
  },
  '99003344': {
    id: 'sup-002',
    businessName: 'Тоног Хэрэгсэл ХХК',
    slug: 'tonog-kheregseel',
    ownerName: 'Болд Энхбаяр',
    phone: '99003344',
    email: 'info@tonog.mn',
    district: 'Сүхбаатар',
    status: 'ACTIVE',
    commissionRate: 8,
    rating: 4.5,
    reviewCount: 89,
    productCount: 256,
  },
  // Pending test account
  '99004455': {
    id: 'sup-p1',
    businessName: 'Шинэ нийлүүлэгч',
    slug: 'shine-niilueulech',
    ownerName: 'Тест Хэрэглэгч',
    phone: '99004455',
    email: 'pending@test.mn',
    district: 'Хан-Уул',
    status: 'PENDING',
    commissionRate: 12,
    rating: 0,
    reviewCount: 0,
    productCount: 0,
  },
};

export function normalizeSupplierPhone(phone: string) {
  return phone.replace(/\D/g, '').slice(-8);
}

export function normalizeSupplierEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getSupplierRegistry(): Record<string, SupplierUser> {
  if (typeof window === 'undefined') return { ...BUILT_IN_SUPPLIERS };
  try {
    const saved = window.localStorage.getItem(SUPPLIER_REGISTRY_KEY);
    return { ...BUILT_IN_SUPPLIERS, ...(saved ? (JSON.parse(saved) as Record<string, SupplierUser>) : {}) };
  } catch {
    return { ...BUILT_IN_SUPPLIERS };
  }
}

export function saveSupplierToRegistry(supplier: SupplierUser) {
  if (typeof window === 'undefined') return;
  try {
    const reg = getSupplierRegistry();
    const key = supplier.email ? normalizeSupplierEmail(supplier.email) : supplier.phone;
    reg[key] = supplier;
    window.localStorage.setItem(SUPPLIER_REGISTRY_KEY, JSON.stringify(reg));
  } catch { /* ignore */ }
}

function findSupplierByEmail(email: string) {
  const cleanEmail = normalizeSupplierEmail(email);
  return Object.values(getSupplierRegistry()).find((supplier) => normalizeSupplierEmail(supplier.email) === cleanEmail);
}

export function setSupplierCookies(supplier: SupplierUser | null) {
  if (typeof document === 'undefined') return;
  if (!supplier) {
    document.cookie = 'diy-supplier=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'diy-supplier-status=; path=/; max-age=0; SameSite=Lax';
    return;
  }
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `diy-supplier=1; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `diy-supplier-status=${supplier.status}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export const useSupplierStore = create<SupplierState>()(
  persist(
    (set) => ({
      supplier: null,
      devOtp: null,
      isLoading: false,
      error: null,

      requestLoginOtp: async (emailInput) => {
        set({ isLoading: true, error: null });
        await new Promise((r) => setTimeout(r, 500));
        const email = normalizeSupplierEmail(emailInput);
        const found = findSupplierByEmail(email);
        if (!found) {
          set({ isLoading: false, error: 'Энэ и-мэйлтэй нийлүүлэгч бүртгэлгүй байна.' });
          return false;
        }
        if (found.status === 'SUSPENDED') {
          set({ isLoading: false, error: 'Таны данс түр хаагдсан байна. Тусламж: 7700-8899' });
          return false;
        }
        console.log(`[Supplier Email OTP] ${email}: ${DEV_OTP}`);
        set({ isLoading: false, devOtp: DEV_OTP });
        return true;
      },

      verifyLoginOtp: async (emailInput, otp) => {
        set({ isLoading: true, error: null });
        await new Promise((r) => setTimeout(r, 400));
        const email = normalizeSupplierEmail(emailInput);
        const found = findSupplierByEmail(email);
        if (!found || otp !== DEV_OTP) {
          set({ isLoading: false, error: 'Код буруу байна. Дахин оролдоно уу.' });
          return { success: false };
        }
        setSupplierCookies(found);
        set({ supplier: found, isLoading: false, devOtp: null });
        const isPending = found.status === 'PENDING' || found.status === 'PENDING_APPROVAL';
        return { success: true, redirectTo: isPending ? '/supplier/pending' : '/supplier/dashboard' };
      },

      logout: () => {
        setSupplierCookies(null);
        set({ supplier: null });
      },

      setSupplier: (supplier) => {
        setSupplierCookies(supplier);
        set({ supplier });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'diy-supplier-auth',
      partialize: (s) => ({ supplier: s.supplier }),
      onRehydrateStorage: () => (state) => {
        if (state?.supplier) setSupplierCookies(state.supplier);
      },
    },
  ),
);
