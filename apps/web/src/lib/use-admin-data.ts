'use client';

import { useEffect, useState } from 'react';
import {
  getMockMetrics, getMockRevenueData, MOCK_ORDERS,
  type AdminOrder,
} from './admin-data';

const ADMIN_API = process.env.NEXT_PUBLIC_VENDURE_ADMIN_API ?? '/admin-api';

async function adminFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ADMIN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Admin API ${res.status}`);
  const json = await res.json() as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

// ─── Orders ──────────────────────────────────────────────────

const ORDERS_QUERY = `
  query AdminOrders($options: OrderListOptions) {
    orders(options: $options) {
      totalItems
      items {
        id
        code
        state
        total
        totalWithTax
        createdAt
        updatedAt
        customer { firstName lastName emailAddress }
        lines { id quantity unitPriceWithTax productVariant { id name sku product { name } } }
        payments { method state amount }
        shippingAddress { fullName streetLine1 city }
      }
    }
  }
`;

function vendureToAdminOrder(o: {
  id: string; code: string; state: string; total: number; totalWithTax: number;
  createdAt: string; updatedAt: string;
  customer?: { firstName: string; lastName: string; emailAddress: string } | null;
  lines: { id: string; quantity: number; unitPriceWithTax: number; productVariant: { id: string; name: string; sku: string; product: { name: string } } }[];
  payments?: { method: string; state: string; amount: number }[];
}): AdminOrder {
  return {
    id: o.id,
    code: o.code.startsWith('DIY-') ? o.code : `DIY-${o.code}`,
    customer: o.customer
      ? { firstName: o.customer.firstName, lastName: o.customer.lastName, emailAddress: o.customer.emailAddress }
      : null,
    state: o.state,
    total: o.total,
    totalWithTax: o.totalWithTax,
    itemCount: o.lines.reduce((s, l) => s + l.quantity, 0),
    paymentState: o.payments?.[0]?.state ?? 'Pending',
    shippingState: 'Pending',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    lines: o.lines.map((l) => ({
      id: l.id,
      quantity: l.quantity,
      unitPriceWithTax: l.unitPriceWithTax,
      productVariant: {
        id: l.productVariant.id,
        name: l.productVariant.name,
        sku: l.productVariant.sku,
        product: { name: l.productVariant.product.name },
      },
    })),
    payments: o.payments,
  };
}

interface UseAdminOrdersResult {
  orders: AdminOrder[];
  totalItems: number;
  isLoading: boolean;
  isLive: boolean;
}

export function useAdminOrders(
  page = 1,
  perPage = 50,
  filterState?: string,
  search?: string,
): UseAdminOrdersResult {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const filter: Record<string, unknown> = {};
    if (filterState) filter.state = { eq: filterState };
    if (search) filter.code = { contains: search };

    adminFetch<{ orders: { totalItems: number; items: Parameters<typeof vendureToAdminOrder>[0][] } }>(
      ORDERS_QUERY,
      { options: { take: perPage, skip: (page - 1) * perPage, filter: Object.keys(filter).length ? filter : undefined } },
    )
      .then(({ orders: result }) => {
        if (cancelled) return;
        setOrders(result.items.map(vendureToAdminOrder));
        setTotalItems(result.totalItems);
        setIsLive(true);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to mock data
        const mock = filterState
          ? MOCK_ORDERS.filter((o) => o.state === filterState)
          : MOCK_ORDERS;
        const searched = search
          ? mock.filter((o) =>
              o.code.toLowerCase().includes(search.toLowerCase()) ||
              `${o.customer?.firstName} ${o.customer?.lastName}`.toLowerCase().includes(search.toLowerCase()),
            )
          : mock;
        setOrders(searched.slice((page - 1) * perPage, page * perPage));
        setTotalItems(searched.length);
        setIsLive(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, perPage, filterState, search]);

  return { orders, totalItems, isLoading, isLive };
}

// ─── Metrics ─────────────────────────────────────────────────

const METRICS_QUERY = `
  query AdminMetrics {
    orders(options: { filter: { createdAt: { after: "2000-01-01" } } }) {
      totalItems
      items { state totalWithTax }
    }
    customers { totalItems }
  }
`;

interface AdminMetrics {
  todayRevenue: number;
  totalOrders: number;
  newCustomers: number;
  pendingOrders: number;
}

interface UseAdminMetricsResult {
  metrics: AdminMetrics;
  revenueData: { date: string; revenue: number; orders: number }[];
  isLive: boolean;
}

export function useAdminMetrics(): UseAdminMetricsResult {
  const [metrics, setMetrics] = useState<AdminMetrics>(getMockMetrics());
  const [revenueData, setRevenueData] = useState(getMockRevenueData());
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    adminFetch<{
      orders: { totalItems: number; items: { state: string; totalWithTax: number }[] };
      customers: { totalItems: number };
    }>(METRICS_QUERY)
      .then(({ orders: o, customers }) => {
        const pending = o.items.filter((i) => i.state === 'PaymentAuthorized').length;
        const settled = o.items.filter((i) => i.state !== 'Cancelled');
        const todayRevenue = settled.slice(0, Math.min(5, settled.length)).reduce((s, i) => s + i.totalWithTax, 0);

        setMetrics({
          todayRevenue,
          totalOrders: o.totalItems,
          newCustomers: customers.totalItems,
          pendingOrders: pending,
        });
        setIsLive(true);
      })
      .catch(() => {
        setMetrics(getMockMetrics());
        setIsLive(false);
      });
  }, []);

  return { metrics, revenueData, isLive };
}
