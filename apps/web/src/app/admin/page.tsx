'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RefreshCw, ShoppingCart, Store, Truck, Users, XCircle } from 'lucide-react';
import { vendureAdminFetch } from '@/lib/vendure';

interface DashboardStats {
  totalOrders: number;
  todayRevenue: number;
  activeSuppliers: number;
  onlineDrivers: number;
  pendingSuppliers: number;
  pendingDrivers: number;
}

interface PendingSupplier {
  id: string;
  ownerName: string;
  phone: string;
  businessName: string;
  createdAt: string;
}

interface PendingDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string;
}

interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
  source: string;
  itemSummary?: string | null;
}

const DASHBOARD_GQL = `
  query AdminDashboard {
    getDashboardStats {
      totalOrders
      todayRevenue
      activeSuppliers
      onlineDrivers
      pendingSuppliers
      pendingDrivers
    }
    getPendingSuppliers {
      id
      ownerName
      phone
      businessName
      createdAt
    }
    getPendingDrivers {
      id
      firstName
      lastName
      phone
      createdAt
    }
    getAllOrders(page: 1, limit: 8) {
      total
      items {
        id
        orderNumber
        customerName
        total
                status
                createdAt
                source
                itemSummary
              }
            }
  }
`;

const UPDATE_SUPPLIER_GQL = `
  mutation UpdateSupplier($id: ID!, $status: String!) {
    adminUpdateSupplierStatus(id: $id, status: $status) { id status }
  }
`;

const UPDATE_DRIVER_GQL = `
  mutation UpdateDriver($id: ID!, $status: String!) {
    adminUpdateDriverStatus(id: $id, status: $status) { id status }
  }
`;

function money(amount: number) {
  return `₮${Math.round(amount / 100).toLocaleString('mn-MN')}`;
}

function date(value: string) {
  return new Date(value).toLocaleString('mn-MN');
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingSuppliers, setPendingSuppliers] = useState<PendingSupplier[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await vendureAdminFetch<{
        getDashboardStats: DashboardStats;
        getPendingSuppliers: PendingSupplier[];
        getPendingDrivers: PendingDriver[];
        getAllOrders: { total: number; items: AdminOrderSummary[] };
      }>(DASHBOARD_GQL);
      setStats(data.getDashboardStats);
      setPendingSuppliers(data.getPendingSuppliers);
      setPendingDrivers(data.getPendingDrivers);
      setOrders(data.getAllOrders.items);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dashboard мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function updateSupplier(id: string, status: 'ACTIVE' | 'REJECTED') {
    setActionLoading(`supplier:${id}:${status}`);
    try {
      await vendureAdminFetch(UPDATE_SUPPLIER_GQL, { id, status });
      await load();
    } finally {
      setActionLoading('');
    }
  }

  async function updateDriver(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    setActionLoading(`driver:${id}:${status}`);
    try {
      await vendureAdminFetch(UPDATE_DRIVER_GQL, { id, status });
      await load();
    } finally {
      setActionLoading('');
    }
  }

  const cards = [
    { label: 'Нийт захиалга', value: stats?.totalOrders ?? 0, icon: ShoppingCart },
    { label: 'Өнөөдрийн орлого', value: money(stats?.todayRevenue ?? 0), icon: Users },
    { label: 'Идэвхтэй нийлүүлэгч', value: stats?.activeSuppliers ?? 0, icon: Store },
    { label: 'Онлайн жолооч', value: stats?.onlineDrivers ?? 0, icon: Truck },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-foreground">Хяналтын самбар</h1>
          <p className="text-sm text-foreground-muted">
            {stats ? `${stats.pendingSuppliers} нийлүүлэгч, ${stats.pendingDrivers} жолооч зөвшөөрөл хүлээж байна` : 'Шууд өгөгдөл татаж байна'}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs text-foreground-muted hover:text-foreground"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Шинэчлэх
        </button>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
            <Icon size={18} className="mb-3 text-brand" />
            <p className="text-xs text-foreground-muted">{label}</p>
            <p className="text-xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Хүлээгдэж буй нийлүүлэгчид</h2>
            <Link href="/admin/suppliers" className="text-xs text-brand">Бүгдийг харах</Link>
          </div>
          <div className="space-y-3">
            {pendingSuppliers.length === 0 && <p className="text-sm text-foreground-muted">Хүлээгдэж буй нийлүүлэгч алга.</p>}
            {pendingSuppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{supplier.businessName || supplier.ownerName}</p>
                  <p className="text-xs text-foreground-muted">{supplier.ownerName} · {supplier.phone} · {date(supplier.createdAt)}</p>
                </div>
                <button
                  onClick={() => void updateSupplier(supplier.id, 'ACTIVE')}
                  disabled={!!actionLoading}
                  className="rounded-lg bg-success/15 p-2 text-success disabled:opacity-50"
                  aria-label="Зөвшөөрөх"
                >
                  <CheckCircle2 size={16} />
                </button>
                <button
                  onClick={() => void updateSupplier(supplier.id, 'REJECTED')}
                  disabled={!!actionLoading}
                  className="rounded-lg bg-error/10 p-2 text-error disabled:opacity-50"
                  aria-label="Татгалзах"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Хүлээгдэж буй жолоочид</h2>
            <Link href="/admin/drivers" className="text-xs text-brand">Бүгдийг харах</Link>
          </div>
          <div className="space-y-3">
            {pendingDrivers.length === 0 && <p className="text-sm text-foreground-muted">Хүлээгдэж буй жолооч алга.</p>}
            {pendingDrivers.map((driver) => (
              <div key={driver.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{driver.firstName} {driver.lastName}</p>
                  <p className="text-xs text-foreground-muted">{driver.phone} · {date(driver.createdAt)}</p>
                </div>
                <button
                  onClick={() => void updateDriver(driver.id, 'ACTIVE')}
                  disabled={!!actionLoading}
                  className="rounded-lg bg-success/15 p-2 text-success disabled:opacity-50"
                  aria-label="Зөвшөөрөх"
                >
                  <CheckCircle2 size={16} />
                </button>
                <button
                  onClick={() => void updateDriver(driver.id, 'SUSPENDED')}
                  disabled={!!actionLoading}
                  className="rounded-lg bg-error/10 p-2 text-error disabled:opacity-50"
                  aria-label="Түдгэлзүүлэх"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--glass-border)] bg-card">
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-5 py-4">
          <h2 className="text-sm font-bold text-foreground">Сүүлийн захиалгууд</h2>
          <Link href="/admin/orders" className="text-xs text-brand">Бүгдийг харах</Link>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          {orders.length === 0 && <p className="px-5 py-6 text-sm text-foreground-muted">Захиалга алга.</p>}
          {orders.map((order) => (
            <Link key={order.id} href={order.source === 'delivery' ? '/admin/deliveries' : `/admin/orders/${order.id}`} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
              <span className="font-mono font-bold text-brand">{order.orderNumber}</span>
              <span className="text-foreground-muted">{order.customerName || '-'}</span>
              <span className="text-foreground">{money(order.total)}</span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-foreground-muted">{order.status}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
