'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  currencyCode: string;
  sku: string;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (variantId: string) => void;
  hasItem: (variantId: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        if (!get().hasItem(item.variantId)) {
          set((s) => ({ items: [...s.items, item] }));
        }
      },

      removeItem: (variantId) => {
        set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) }));
      },

      hasItem: (variantId) => get().items.some((i) => i.variantId === variantId),

      clear: () => set({ items: [] }),
    }),
    { name: 'diy-store-wishlist' },
  ),
);
