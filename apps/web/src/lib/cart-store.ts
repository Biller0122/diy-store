'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────

export interface CartItem {
  id: string;          // unique cart row id
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;       // priceWithTax in minor units (÷100 = ₮)
  currencyCode: string;
  qty: number;
  mode: 'pickup' | 'delivery';
  storeId: string | null;
  sku: string;
  supplierId?: string;
  supplierName?: string;
  supplierSlug?: string;
  supplierDistrict?: string;
  supplierLat?: number;
  supplierLng?: number;
}

export interface Address {
  province: string;
  district: string;
  khoroo: string;
  address: string;
  doorCode?: string;
  note?: string;
  lat?: number;
  lng?: number;
}

export interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  supplierSlug: string;
  supplierDistrict?: string;
  supplierLat?: number;
  supplierLng?: number;
  items: CartItem[];
  subtotal: number;
}

export interface FeeBreakdown {
  baseFee: number;
  distanceFee: number;
  multiStopFee: number;
  weightFee: number;
  totalDistanceKm: number;
}

export interface PromoResult {
  code: string;
  discountPct: number;
  label: string;
}

interface CartState {
  items: CartItem[];
  promo: PromoResult | null;
  customerAddress: Address | null;
  deliveryFee: number;
  feeBreakdown: FeeBreakdown | null;

  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  updateMode: (id: string, mode: 'pickup' | 'delivery', storeId?: string) => void;
  clearCart: () => void;
  applyPromo: (code: string) => { success: boolean; message: string };
  removePromo: () => void;
  setCustomerAddress: (address: Address | null) => void;
  updateDeliveryFee: (fee: number, breakdown?: FeeBreakdown) => void;
}

// ─── Promo codes ──────────────────────────────────────────────

const PROMOS: Record<string, PromoResult> = {
  DIY10:      { code: 'DIY10',      discountPct: 10, label: '10% хямдрал' },
  ШИНЭ20:     { code: 'ШИНЭ20',     discountPct: 20, label: 'Шинэ хэрэглэгчид 20%' },
  БАЯНЗҮРХ:   { code: 'БАЯНЗҮРХ',   discountPct:  5, label: 'Баянзүрх салбарын 5%' },
};

export const DEFAULT_DELIVERY_FEE = 550_000; // ₮5,500 fallback

// ─── Store ────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      promo: null,
      customerAddress: null,
      deliveryFee: DEFAULT_DELIVERY_FEE,
      feeBreakdown: null,

      addItem: (item) =>
        set((s) => {
          const existing = s.items.find(
            (i) => i.variantId === item.variantId && i.supplierId === item.supplierId,
          );
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.variantId === item.variantId && i.supplierId === item.supplierId
                  ? { ...i, qty: i.qty + item.qty }
                  : i,
              ),
            };
          }
          return {
            items: [...s.items, { ...item, id: `${item.variantId}-${Date.now()}` }],
          };
        }),

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) => {
        if (qty < 1) return;
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        }));
      },

      updateMode: (id, mode, storeId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, mode, ...(storeId ? { storeId } : {}) } : i,
          ),
        })),

      clearCart: () => set({ items: [], promo: null, customerAddress: null, deliveryFee: DEFAULT_DELIVERY_FEE, feeBreakdown: null }),

      applyPromo: (code) => {
        const promo = PROMOS[code.trim().toUpperCase()];
        if (!promo) return { success: false, message: 'Промо код буруу байна.' };
        set({ promo });
        return { success: true, message: `${promo.label} амжилттай нэмэгдлээ!` };
      },

      removePromo: () => set({ promo: null }),

      setCustomerAddress: (address) => set({ customerAddress: address }),

      updateDeliveryFee: (fee, breakdown) => set({ deliveryFee: fee, feeBreakdown: breakdown ?? null }),
    }),
    {
      name: 'diy-store-cart',
      partialize: (s) => ({
        items: s.items,
        promo: s.promo,
        customerAddress: s.customerAddress,
        deliveryFee: s.deliveryFee,
        feeBreakdown: s.feeBreakdown,
      }),
    },
  ),
);

// ─── Pure derived helpers ──────────────────────────────────────

export function getSupplierGroups(items: CartItem[]): SupplierGroup[] {
  const map = new Map<string, SupplierGroup>();
  for (const item of items) {
    const key = item.supplierId ?? '__unknown__';
    if (!map.has(key)) {
      map.set(key, {
        supplierId: item.supplierId ?? '__unknown__',
        supplierName: item.supplierName ?? 'Бусад',
        supplierSlug: item.supplierSlug ?? '',
        supplierDistrict: item.supplierDistrict,
        supplierLat: item.supplierLat,
        supplierLng: item.supplierLng,
        items: [],
        subtotal: 0,
      });
    }
    const group = map.get(key)!;
    group.items.push(item);
    group.subtotal += item.price * item.qty;
  }
  return Array.from(map.values());
}

export const calcSubtotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.price * i.qty, 0);

export const calcDiscount = (subtotal: number, promo: PromoResult | null) =>
  promo ? Math.round(subtotal * (promo.discountPct / 100)) : 0;

export const calcDeliveryFee = (items: CartItem[], storedFee?: number) =>
  items.some((i) => i.mode === 'delivery') ? (storedFee ?? DEFAULT_DELIVERY_FEE) : 0;

export const calcTotal = (items: CartItem[], promo: PromoResult | null, storedFee?: number) => {
  const sub = calcSubtotal(items);
  return sub + calcDeliveryFee(items, storedFee) - calcDiscount(sub, promo);
};
