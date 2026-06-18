'use client';

import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { vendureShopFetch } from './vendure';
import { useSupplierStore } from './supplier-store';

// ─── Types ──────────────────────────────────────────────────────

export type SupplierOrderRaw = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderTotal: number;
  supplierStatus: string;
  status: string;
  createdAt: string;
  orderItems: { supplierId: string; name: string; qty: number; price: number }[];
};

export type SupplierProductRaw = {
  id: string;
  name: string;
  slug: string;
  stock: number;
  enabled: boolean;
};

export const LOW_STOCK_THRESHOLD = 3;

// ─── Queries (real backend) ─────────────────────────────────────

const ORDERS_QUERY = `
  query SupplierDeliveryOrders($supplierId: String!) {
    supplierDeliveryRequests(supplierId: $supplierId) {
      id orderId orderNumber customerName customerPhone
      orderTotal supplierStatus status createdAt
      orderItems { supplierId name qty price }
    }
  }
`;

const PRODUCTS_QUERY = `
  query SupplierProductsData($supplierId: String) {
    supplierProducts(supplierId: $supplierId) {
      items { id name slug stock enabled }
    }
  }
`;

export function useSupplierOrdersData() {
  const supplierId = useSupplierStore((s) => s.supplier?.id);
  return useQuery({
    queryKey: ['supplier-orders', supplierId],
    enabled: !!supplierId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const data = await vendureShopFetch<{ supplierDeliveryRequests: SupplierOrderRaw[] }>(ORDERS_QUERY, { supplierId });
      return data.supplierDeliveryRequests ?? [];
    },
  });
}

export function useSupplierProductsData() {
  const supplierId = useSupplierStore((s) => s.supplier?.id);
  return useQuery({
    queryKey: ['supplier-products-data', supplierId],
    enabled: !!supplierId,
    staleTime: 30_000,
    queryFn: async () => {
      const data = await vendureShopFetch<{ supplierProducts: { items: SupplierProductRaw[] } }>(PRODUCTS_QUERY, { supplierId });
      return data.supplierProducts?.items ?? [];
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────

export function supplierItemsFor(order: SupplierOrderRaw, supplierId?: string) {
  return order.orderItems.filter((item) => String(item.supplierId) === String(supplierId));
}

/** Order total counting only this supplier's items (minor units / ₮×100). */
export function orderTotalFor(order: SupplierOrderRaw, supplierId?: string) {
  const items = supplierItemsFor(order, supplierId);
  const sum = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  return sum || order.orderTotal || 0;
}

export function isNewOrder(order: SupplierOrderRaw) {
  return order.status !== 'COMPLETED'
    && order.supplierStatus !== 'ACCEPTED'
    && order.supplierStatus !== 'REJECTED';
}

export function isDeliveredOrder(order: SupplierOrderRaw) {
  return order.status === 'COMPLETED';
}

// ─── Notifications ──────────────────────────────────────────────

export type SupplierNotification = {
  id: string;
  kind: 'order' | 'low_stock';
  title: string;
  body: string;
  href: string;
  ts: number;
};

export function buildNotifications(
  orders: SupplierOrderRaw[],
  products: SupplierProductRaw[],
  supplierId?: string,
): SupplierNotification[] {
  const list: SupplierNotification[] = [];

  // Шинэ захиалга бүрт мэдэгдэл (захиалгын мэдээлэлтэй)
  for (const order of orders) {
    if (!isNewOrder(order)) continue;
    const total = orderTotalFor(order, supplierId);
    list.push({
      id: `order-${order.id}`,
      kind: 'order',
      title: `Шинэ захиалга #${order.orderNumber || order.orderId}`,
      body: `${order.customerName || 'Хэрэглэгч'} · ₮${Math.round(total / 100).toLocaleString('mn-MN')}`,
      href: '/supplier/orders',
      ts: new Date(order.createdAt).getTime() || 0,
    });
  }

  // Үлдэгдэл 3-с доош бараа байвал мэдэгдэл
  const low = products.filter((p) => p.enabled && p.stock < LOW_STOCK_THRESHOLD);
  if (low.length > 0) {
    list.push({
      id: `low-stock-${low.map((p) => `${p.id}:${p.stock}`).join('|')}`,
      kind: 'low_stock',
      title: 'Үлдэгдэл багатай бараа',
      body: `${low.length} бараа үлдэгдэл ${LOW_STOCK_THRESHOLD}-с доош байна. Та үлдэгдэл багатай бараагаа шалгана уу.`,
      href: '/supplier/products',
      ts: Number.MAX_SAFE_INTEGER, // эхэнд харагдана
    });
  }

  return list.sort((a, b) => b.ts - a.ts);
}

// ─── "Seen" state (badge тоолуур) ───────────────────────────────

interface NotifSeenState {
  seen: string[];
  markSeen: (ids: string[]) => void;
}

export const useNotifSeen = create<NotifSeenState>()(
  persist(
    (set) => ({
      seen: [],
      markSeen: (ids) => set((s) => ({ seen: Array.from(new Set([...s.seen, ...ids])).slice(-200) })),
    }),
    { name: 'diy-supplier-notif-seen' },
  ),
);
