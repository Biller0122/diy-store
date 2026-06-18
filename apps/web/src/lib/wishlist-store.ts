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
  ownerId: string | null;
  addItem: (item: WishlistItem) => void;
  removeItem: (variantId: string) => void;
  hasItem: (variantId: string) => boolean;
  clear: () => void;
  /** Reset the wishlist when the logged-in user changes. */
  syncOwner: (id: string | null) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      ownerId: null,

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

      syncOwner: (id) => set((s) => (s.ownerId === id ? {} : { ownerId: id, items: [] })),
    }),
    { name: 'diy-store-wishlist' },
  ),
);
