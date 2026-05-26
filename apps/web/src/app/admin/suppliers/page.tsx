'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, RefreshCw, Search, Store, XCircle } from 'lucide-react';

type SupplierStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

interface ApiSupplier {
  id: string;
  businessName: string;
  slug: string;
  ownerName: string;
  phone: string;
  email: string;
  district?: string;
  khoroo?: string;
  address?: string;
  registrationNumber?: string;
  commissionRate: number;
  status: SupplierStatus;
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING_VERIFICATION: { label: 'OTP хүлээж байна', cls: 'bg-blue-500/15 text-blue-400' },
  PENDING_APPROVAL:     { label: 'Хүлээгдэж байна', cls: 'bg-amber-500/15 text-amber-400' },
  PENDING:              { label: 'Хүлээгдэж байна', cls: 'bg-amber-500/15 text-amber-400' },
  ACTIVE:               { label: 'Идэвхтэй',        cls: 'bg-success/15 text-success' },
  SUSPENDED:            { label: 'Түдгэлзүүлсэн',   cls: 'bg-error/15 text-error' },
  REJECTED:             { label: 'Татгалзсан',       cls: 'bg-error/15 text-error' },
};

const SHOP_API = process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? 'http://localhost:3001/shop-api';

const SUPPLIERS_GQL = `
  query AdminGetSuppliers($take: Int, $skip: Int) {
    suppliers(take: $take, skip: $skip) {
      items {
        id businessName slug ownerName phone email
        district khoroo address registrationNumber
        commissionRate status createdAt
      }
      total
    }
  }
`;

const UPDATE_STATUS_GQL = `
  mutation AdminUpdateSupplierStatus($id: ID!, $status: String!, $reason: String) {
    updateSupplierStatus(id: $id, status: $status, reason: $reason) {
      id status
    }
  }
`;

async function gqlFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(SHOP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error('NETWORK');
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'GQL_ERROR');
  return json.data as T;
}

const REGISTRY_KEY = 'diy-supplier-registry';

function getLocalSuppliers(): ApiSupplier[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {};
    return Object.values(saved).map((s) => ({
      id: String(s.id ?? ''),
      businessName: String(s.businessName ?? ''),
      slug: String(s.slug ?? ''),
      ownerName: String(s.ownerName ?? ''),
      phone: String(s.phone ?? ''),
      email: String(s.email ?? ''),
      district: s.district ? String(s.district) : undefined,
      commissionRate: Number(s.commissionRate ?? 10),
      status: String(s.status ?? 'PENDING') as SupplierStatus,
      createdAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function updateLocalSupplierStatus(id: string, status: SupplierStatus) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {};
    for (const key of Object.keys(saved)) {
      if (saved[key].id === id) {
        saved[key] = { ...saved[key], status };
        break;
      }
    }
    window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(saved));
    console.log('[Admin] localStorage supplier status updated:', { id, status });
  } catch { /* ignore */ }
}

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupplierStatus>('PENDING_APPROVAL');
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [source, setSource] = useState<'api' | 'local'>('api');

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await gqlFetch<{ suppliers: { items: ApiSupplier[]; total: number } }>(
        SUPPLIERS_GQL, { take: 100, skip: 0 },
      );
      const items = data.suppliers.items;
      console.log('[Admin] Suppliers from API:', items.length, 'items', items);
      setSuppliers(items);
      setTotal(data.suppliers.total);
      setSource('api');
      setLastFetch(new Date());
    } catch (err) {
      console.warn('[Admin] API unavailable, using localStorage fallback:', err);
      const local = getLocalSuppliers();
      console.log('[Admin] Suppliers from localStorage:', local.length, 'items', local);
      setSuppliers(local);
      setTotal(local.length);
      setSource('local');
      setLastFetch(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSuppliers();
    const interval = setInterval(() => void fetchSuppliers(), 30_000);
    return () => clearInterval(interval);
  }, [fetchSuppliers]);

  const handleStatusUpdate = async (id: string, status: SupplierStatus, reason?: string) => {
    setActionLoading(id + status);
    setActionError('');
    try {
      await gqlFetch(UPDATE_STATUS_GQL, { id, status, reason });
      await fetchSuppliers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Алдаа гарлаа';
      const isNetworkError = msg === 'Failed to fetch' || msg === 'NETWORK';
      if (isNetworkError && source === 'local') {
        // Server is down — update localStorage directly so the dev flow still works
        updateLocalSupplierStatus(id, status);
        setSuppliers((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
        console.log('[Admin] Offline approval saved to localStorage:', { id, status });
      } else {
        console.error('[Admin] updateSupplierStatus failed:', msg, { id, status });
        setActionError(`Төлөв солихоос алдаа гарлаа: ${msg}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = useMemo(
    () => suppliers.filter((s) => s.status === 'PENDING_APPROVAL' || s.status === 'PENDING').length,
    [suppliers],
  );

  const filtered = useMemo(() => suppliers.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (!search) return true;
    const needle = search.toLowerCase();
    return (
      s.businessName.toLowerCase().includes(needle) ||
      s.phone.includes(search) ||
      s.ownerName.toLowerCase().includes(needle) ||
      (s.registrationNumber ?? '').includes(search)
    );
  }), [suppliers, search, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Нийлүүлэгчид</h2>
          <p className="mt-0.5 text-sm text-foreground-muted">
            Нийт бүртгэл: {total}
            {source === 'local' && ' · (localStorage)'}
            {lastFetch && ` · ${lastFetch.toLocaleTimeString('mn-MN')}-д шинэчлэгдсэн`}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); void fetchSuppliers(); }}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs text-foreground-muted hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Шинэчлэх
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Нэр, утас, регистр хайх..."
            className="w-full rounded-xl border border-[var(--glass-border)] bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['all', 'Бүгд'],
            ['PENDING_APPROVAL', `Хүлээгдэж буй${pendingCount > 0 ? ` (${pendingCount})` : ''}`],
            ['PENDING_VERIFICATION', 'OTP хүлээж байна'],
            ['ACTIVE', 'Идэвхтэй'],
            ['REJECTED', 'Татгалзсан'],
            ['SUSPENDED', 'Түдгэлзүүлсэн'],
          ] as [string, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key as 'all' | SupplierStatus)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === key
                  ? 'bg-brand text-white'
                  : 'border border-[var(--glass-border)] bg-card text-foreground-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-3 text-xs underline">Хаах</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-8 text-center">
          <Store size={32} className="mx-auto mb-3 text-foreground-muted opacity-40" />
          <p className="text-sm text-foreground-muted">Бүртгэл олдсонгүй</p>
          {statusFilter === 'PENDING_APPROVAL' && (
            <p className="mt-1 text-xs text-foreground-muted">Шинэ нийлүүлэгчийн бүртгэл ирэхийг хүлээж байна</p>
          )}
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((supplier) => {
          const meta = STATUS_META[supplier.status] ?? { label: supplier.status, cls: 'bg-foreground-muted/15 text-foreground-muted' };
          const isPending = supplier.status === 'PENDING_APPROVAL' || supplier.status === 'PENDING';
          return (
            <article key={supplier.id} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                    <Store size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-foreground">{supplier.businessName}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {supplier.ownerName} · {supplier.phone} · {supplier.email}
                    </p>
                    {supplier.district && (
                      <p className="mt-1 text-xs text-foreground-muted">{supplier.district}</p>
                    )}
                    <p className="mt-1 text-[10px] text-foreground-muted">
                      Бүртгэсэн: {new Date(supplier.createdAt).toLocaleString('mn-MN')}
                      {` · Комисс: ${supplier.commissionRate}%`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/suppliers/${supplier.id}`}
                    className="rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground"
                  >
                    Дэлгэрэнгүй
                  </Link>
                  {isPending && (
                    <>
                      <button
                        disabled={!!actionLoading}
                        onClick={() => void handleStatusUpdate(supplier.id, 'ACTIVE')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-success/15 px-3 py-2 text-xs font-semibold text-success hover:bg-success/25 disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} />
                        {actionLoading === supplier.id + 'ACTIVE' ? '...' : 'Зөвшөөрөх'}
                      </button>
                      <button
                        disabled={!!actionLoading}
                        onClick={() => void handleStatusUpdate(supplier.id, 'REJECTED', 'Шаардлага хангаагүй')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-error/10 px-3 py-2 text-xs font-semibold text-error hover:bg-error/20 disabled:opacity-50"
                      >
                        <XCircle size={13} />
                        {actionLoading === supplier.id + 'REJECTED' ? '...' : 'Татгалзах'}
                      </button>
                    </>
                  )}
                  {supplier.status === 'ACTIVE' && (
                    <button
                      disabled={!!actionLoading}
                      onClick={() => void handleStatusUpdate(supplier.id, 'SUSPENDED')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/25 disabled:opacity-50"
                    >
                      <Clock size={13} />
                      {actionLoading === supplier.id + 'SUSPENDED' ? '...' : 'Түдгэлзүүлэх'}
                    </button>
                  )}
                  {supplier.status === 'SUSPENDED' && (
                    <button
                      disabled={!!actionLoading}
                      onClick={() => void handleStatusUpdate(supplier.id, 'ACTIVE')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-success/15 px-3 py-2 text-xs font-semibold text-success hover:bg-success/25 disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} />
                      {actionLoading === supplier.id + 'ACTIVE' ? '...' : 'Идэвхжүүлэх'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
