'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomerAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  district: string;
  street: string;
  building: string;
  apartment: string;
  isDefault: boolean;
}

interface CustomerAddressState {
  addresses: CustomerAddress[];
  addAddress: (address: Omit<CustomerAddress, 'id' | 'isDefault'>) => void;
  updateAddress: (id: string, address: Omit<CustomerAddress, 'id' | 'isDefault'>) => void;
  deleteAddress: (id: string) => void;
  setDefault: (id: string) => void;
  getDefaultAddress: () => CustomerAddress | null;
}

function ensureDefault(addresses: CustomerAddress[]) {
  if (addresses.length === 0 || addresses.some((address) => address.isDefault)) return addresses;
  return addresses.map((address, index) => ({ ...address, isDefault: index === 0 }));
}

export const useCustomerAddressStore = create<CustomerAddressState>()(
  persist(
    (set, get) => ({
      addresses: [],

      addAddress: (address) => set((state) => ({
        addresses: [
          ...state.addresses,
          { ...address, id: `${Date.now()}`, isDefault: state.addresses.length === 0 },
        ],
      })),

      updateAddress: (id, address) => set((state) => ({
        addresses: state.addresses.map((current) => (
          current.id === id ? { ...current, ...address } : current
        )),
      })),

      deleteAddress: (id) => set((state) => ({
        addresses: ensureDefault(state.addresses.filter((address) => address.id !== id)),
      })),

      setDefault: (id) => set((state) => ({
        addresses: state.addresses.map((address) => ({ ...address, isDefault: address.id === id })),
      })),

      getDefaultAddress: () => {
        const addresses = get().addresses;
        return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
      },
    }),
    { name: 'diy-customer-addresses' },
  ),
);
