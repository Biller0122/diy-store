'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Percent, RefreshCw, Save, Store, TrendingUp } from 'lucide-react';
import { vendureAdminFetch } from '@/lib/vendure';

type SupplierStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

type Supplier = {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  commissionRate: number;
  status: SupplierStatus;
};

type SupplierOrder = {
  id: string;
  total: number;
  createdAt: string;
  state: string;
};

const SUPPLIERS_QUERY = `
  query CommissionSuppliers($status: String) {
    getSuppliersByStatus(status: $status) {
      id
      businessName
      ownerName
      email
      phone
      commissionRate
      status
    }
  }
`;

const ORDERS_QUERY = `
  query CommissionOrders {
    supplierOrders(take: 200, skip: 0) {
      total
      items {
        id
        total
        createdAt
        state
      }
    }
  }
`;

const UPDATE_SUPPLIER = `
  mutation UpdateSupplierCommission($id: ID!, $input: UpdateSupplierInput!) {
    updateSupplier(id: $id, input: $input) {
      id
      commissionRate
    }
  }
`;

function fmt(amount: number) {
  return `₮${Math.round(amount / 100).toLocaleString('mn-MN')}`;
}

function clampRate(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(50, value));
}

function isThisMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export default function AdminCommissionPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [supplierData, orderData] = await Promise.all([
        vendureAdminFetch<{ getSuppliersByStatus: Supplier[] }>(SUPPLIERS_QUERY, { status: 'ACTIVE' }),
        vendureAdminFetch<{ supplierOrders: { total: number; items: SupplierOrder[] } }>(ORDERS_QUERY),
      ]);
      const nextSuppliers = supplierData.getSuppliersByStatus ?? [];
      setSuppliers(nextSuppliers);
      setOrders(orderData.supplierOrders?.items ?? []);
      setRates(Object.fromEntries(nextSuppliers.map((supplier) => [
        supplier.id,
        String(supplier.commissionRate ?? 10),
      ])));
      setLastFetch(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Комиссийн мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const changedSuppliers = useMemo(() => suppliers.filter((supplier) => {
    const nextRate = clampRate(Number(rates[supplier.id] ?? supplier.commissionRate));
    return nextRate !== supplier.commissionRate;
  }), [rates, suppliers]);

  const activeOrders = useMemo(() => orders.filter((order) => order.state !== 'Cancelled'), [orders]);
  const thisMonthOrders = useMemo(() => activeOrders.filter((order) => isThisMonth(order.createdAt)), [activeOrders]);
  const thisMonthGMV = useMemo(() => thisMonthOrders.reduce((sum, order) => sum + order.total, 0), [thisMonthOrders]);
  const averageRate = useMemo(() => {
    if (suppliers.length === 0) return 0;
    return suppliers.reduce((sum, supplier) => sum + clampRate(Number(rates[supplier.id] ?? supplier.commissionRate)), 0) / suppliers.length;
  }, [rates, suppliers]);
  const estimatedCommission = Math.round(thisMonthGMV * averageRate / 100);

  function updateRate(id: string, value: string) {
    setRates((current) => ({ ...current, [id]: value }));
    setMessage('');
  }

  async function save() {
    if (changedSuppliers.length === 0) {
      setMessage('Өөрчлөлт алга.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await Promise.all(changedSuppliers.map((supplier) =>
        vendureAdminFetch(UPDATE_SUPPLIER, {
          id: supplier.id,
          input: { commissionRate: clampRate(Number(rates[supplier.id])) },
        }),
      ));
      setMessage(`${changedSuppliers.length} нийлүүлэгчийн комисс хадгалагдлаа.`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Комисс хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Комиссийн тохиргоо</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">
            Mock өгөгдөлгүй. Нийлүүлэгч бүрийн комисс backend DB дээр хадгалагдана.
          </p>
          {lastFetch && (
            <p className="mt-1 text-xs text-foreground-muted">
              Сүүлд шинэчилсэн: {lastFetch.toLocaleTimeString('mn-MN')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchData}
            disabled={loading || saving}
            className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-4 py-2.5 text-sm font-semibold text-foreground-muted hover:bg-white/5 hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Шинэчлэх
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Хадгалах
          </button>
        </div>
      </div>

      {(error || message) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          error
            ? 'border-error/30 bg-error/10 text-error'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        }`}>
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: TrendingUp, label: 'Энэ сарын нийт орлого', value: fmt(thisMonthGMV), color: 'text-brand' },
          { icon: Percent, label: `Тооцоолсон комисс (${averageRate.toFixed(1)}%)`, value: fmt(estimatedCommission), color: 'text-success' },
          { icon: Store, label: 'Идэвхтэй нийлүүлэгч', value: `${suppliers.length}`, color: 'text-foreground' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-[var(--glass-border)] bg-card p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
              <Icon size={18} className="text-brand" />
            </div>
            <div>
              <p className="text-xs text-foreground-muted">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-card">
        <div className="border-b border-[var(--glass-border)] px-5 py-4">
          <h2 className="text-sm font-bold text-foreground">Нийлүүлэгч бүрийн комисс</h2>
          <p className="mt-0.5 text-xs text-foreground-muted">
            Энд өөрчилсөн хувь нь supplier-ийн `commissionRate` талбарт шууд хадгалагдана.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={22} className="animate-spin text-brand" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-20 text-center text-sm text-foreground-muted">
            Идэвхтэй нийлүүлэгч алга байна.
          </div>
        ) : (
          <div className="divide-y divide-[var(--glass-border)]">
            {suppliers.map((supplier) => {
              const changed = changedSuppliers.some((item) => item.id === supplier.id);
              return (
                <div key={supplier.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{supplier.businessName}</p>
                      {changed && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Өөрчлөгдсөн
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-foreground-muted">
                      {supplier.ownerName} · {supplier.email || supplier.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={rates[supplier.id] ?? ''}
                      onChange={(event) => updateRate(supplier.id, event.target.value)}
                      className="w-24 rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-center text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-brand"
                    />
                    <span className="text-sm text-foreground-muted">%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
