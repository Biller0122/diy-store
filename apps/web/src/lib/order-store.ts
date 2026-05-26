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
  paymentMethod: string;
}

interface OrderState {
  orders: PlacedOrder[];
  addOrder: (order: PlacedOrder) => void;
  updateStatus: (code: string, status: OrderStatus) => void;
  getOrder: (code: string) => PlacedOrder | undefined;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (order) => {
        set((s) => ({ orders: [order, ...s.orders] }));
      },

      updateStatus: (code, status) => {
        set((s) => ({
          orders: s.orders.map((o) => (o.code === code ? { ...o, status } : o)),
        }));
      },

      getOrder: (code) => get().orders.find((o) => o.code === code),
    }),
    { name: 'diy-store-orders' },
  ),
);
