'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlacedOrderItem {
  variantId: string;
  name: string;
  sku: string;
  qty: number;
  price: number;
  image: string;
}

export type OrderStatus = 'Хүлээгдэж буй' | 'Боловсруулж буй' | 'Хүргэлтэнд' | 'Хүргэгдсэн' | 'Цуцлагдсан';

export interface PlacedOrder {
  id: string;
  code: string;
  placedAt: string; // ISO date string
  status: OrderStatus;
  total: number;
  items: PlacedOrderItem[];
  deliveryAddress?: string;
  trackingToken?: string;
  paymentMethod: string;
}

interface OrderState {
  orders: PlacedOrder[];
  ownerId: string | null;
  addOrder: (order: PlacedOrder) => void;
  updateStatus: (code: string, status: OrderStatus) => void;
  getOrder: (code: string) => PlacedOrder | undefined;
  /** Bind orders to a customer; if the owner changes, wipe the previous user's
   *  orders so a newly logged-in user never sees someone else's data. */
  syncOwner: (id: string | null) => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      ownerId: null,

      addOrder: (order) => {
        set((s) => ({ orders: [order, ...s.orders] }));
      },

      updateStatus: (code, status) => {
        set((s) => ({
          orders: s.orders.map((o) => (o.code === code ? { ...o, status } : o)),
        }));
      },

      getOrder: (code) => get().orders.find((o) => o.code === code),

      syncOwner: (id) => set((s) => (s.ownerId === id ? {} : { ownerId: id, orders: [] })),
    }),
    { name: 'diy-store-orders' },
  ),
);
