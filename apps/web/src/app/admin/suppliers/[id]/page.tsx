'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, Loader2, Store, XCircle } from 'lucide-react';

type SupplierStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

interface StatusHistoryEntry {
  status: string;
  reason?: string;
  at: string;
}

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
  description?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  commissionRate: number;
  status: SupplierStatus;
  createdAt: string;
  statusHistory?: StatusHistoryEntry[];
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING_VERIFICATION: { label: 'OTP хүлээж байна', cls: 'bg-blue-500/15 text-blue-400' },
  PENDING_APPROVAL:     { label: 'Хүлээгдэж байна', cls: 'bg-amber-500/15 text-amber-400' },
  PENDING:              { label: 'Хүлээгдэж байна', cls: 'bg-amber-500/15 text-amber-400' },
  ACTIVE:               { label: 'Идэвхтэй',        cls: 'bg-success/15 text-success' },
  SUSPENDED:            { label: 'Түдгэлзүүлсэн',   cls: 'bg-error/15 text-error' },
  REJECTED:             { label: 'Татгалзсан',       cls: 'bg-error/15 text-error' },
};

const STATUS_HISTORY_LABELS: Record<string, string> = {
  PENDING_VERIFICATION: 'Бүртгэл илгээгдсэн',
  PENDING_APPROVAL:     'OTP баталгаажсан — хянагдаж байна',
  PENDING:              'Хүлээгдэж байна',
  ACTIVE:               'Идэвхжүүлсэн',
  SUSPENDED:            'Түдгэлзүүлсэн',
  REJECTED:             'Татгалзсан',
};

const SHOP_API = process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? 'http://localhost:3001/shop-api';

const SUPPLIER_GQL = `
  query AdminGetSupplier($id: ID!) {
    supplier(id: $id) {
      id businessName slug ownerName phone email
      district khoroo address registrationNumber description
      bankName bankAccount bankAccountName
      pickupEnabled deliveryEnabled commissionRate status createdAt
      statusHistory { status reason at }
    }
  }
`;

const UPDATE_STATUS_GQL = `
  mutation AdminUpdateSupplierStatus($id: ID!, $status: String!, $reason: String) {
    updateSupplierStatus(id: $id, status: $status, reason: $reason) {
      id status statusHistory { status reason at }
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

function getLocalSupplierById(id: string): ApiSupplier | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {};
    const found = Object.values(saved).find((s) => s.id === id);
    if (!found) return null;
    return {
      id: String(found.id ?? ''),
      businessName: String(found.businessName ?? ''),
      slug: String(found.slug ?? ''),
      ownerName: String(found.ownerName ?? ''),
      phone: String(found.phone ?? ''),
      email: String(found.email ?? ''),
      district: found.district ? String(found.district) : undefined,
      commissionRate: Number(found.commissionRate ?? 10),
      status: String(found.status ?? 'PENDING') as SupplierStatus,
      pickupEnabled: true,
      deliveryEnabled: true,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
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

export default function AdminSupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [supplier, setSupplier] = useState<ApiSupplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dataSource, setDataSource] = useState<'api' | 'local'>('api');

  useEffect(() => {
    async function load() {
      try {
        const data = await gqlFetch<{ supplier: ApiSupplier | null }>(SUPPLIER_GQL, { id });
        if (data.supplier) {
          setSupplier(data.supplier);
          setDataSource('api');
        } else {
          setFetchError('Нийлүүлэгч олдсонгүй');
        }
      } catch {
        const local = getLocalSupplierById(id);
        if (local) {
          setSupplier(local);
          setDataSource('local');
        } else {
          setFetchError('Нийлүүлэгч олдсонгүй');
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  const handleStatusUpdate = async (status: SupplierStatus, reason?: string) => {
    if (!supplier) return;
    setActionLoading(status);
    setActionError('');
    try {
      const data = await gqlFetch<{ updateSupplierStatus: ApiSupplier }>(
        UPDATE_STATUS_GQL, { id: supplier.id, status, reason },
      );
      setSupplier((prev) => prev ? { ...prev, ...data.updateSupplierStatus } : prev);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Алдаа гарлаа';
      const isNetworkError = msg === 'Failed to fetch' || msg === 'NETWORK';
      if (isNetworkError && dataSource === 'local') {
        updateLocalSupplierStatus(supplier.id, status);
        setSupplier((prev) => prev ? { ...prev, status } : prev);
        console.log('[Admin] Offline approval saved to localStorage:', { id: supplier.id, status });
      } else {
        console.error('[Admin] updateSupplierStatus failed:', msg, { id: supplier.id, status });
        setActionError(`Төлөв солихоос алдаа гарлаа: ${msg}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-brand" />
      </div>
    );
  }

  if (fetchError || !supplier) {
    return (
      <div className="space-y-4">
        <Link href="/admin/suppliers" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground">
          <ArrowLeft size={16} /> Буцах
        </Link>
        <p className="text-error">{fetchError || 'Нийлүүлэгч олдсонгүй'}</p>
      </div>
    );
  }

  const meta = STATUS_META[supplier.status] ?? { label: supplier.status, cls: 'bg-foreground-muted/15 text-foreground-muted' };
  const isPending = supplier.status === 'PENDING_APPROVAL' || supplier.status === 'PENDING';

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/suppliers" className="rounded-xl p-2 text-foreground-muted hover:bg-white/5 hover:text-foreground">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-lg font-bold text-foreground">{supplier.businessName}</h2>
          <p className="text-xs text-foreground-muted">Бүртгэлийн ID: {id}</p>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
      </div>

      <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <Store size={22} />
          </div>
          <div>
            <p className="font-bold text-foreground">{supplier.businessName}</p>
            {supplier.registrationNumber && (
              <p className="text-xs text-foreground-muted">РД: {supplier.registrationNumber}</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ['Эзэмшигч',        supplier.ownerName],
            ['Утас',            supplier.phone],
            ['И-мэйл',          supplier.email],
            ['Дүүрэг',          supplier.district || '—'],
            ['Хороо',           supplier.khoroo || '—'],
            ['Хаяг',            supplier.address || '—'],
            ['Банк',            supplier.bankName || '—'],
            ['Данс',            supplier.bankAccount || '—'],
            ['Данс эзэмшигч',   supplier.bankAccountName || '—'],
            ['Pickup',          supplier.pickupEnabled ? 'Тийм' : 'Үгүй'],
            ['Хүргэлт',         supplier.deliveryEnabled ? 'Тийм' : 'Үгүй'],
            ['Комисс',          `${supplier.commissionRate}%`],
            ['Бүртгэсэн огноо', new Date(supplier.createdAt).toLocaleString('mn-MN')],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface px-3 py-2">
              <p className="text-[10px] text-foreground-muted">{label}</p>
              <p className="text-sm text-foreground">{value}</p>
            </div>
          ))}
        </div>
        {supplier.description && (
          <div className="mt-3 rounded-xl bg-surface px-3 py-2">
            <p className="text-[10px] text-foreground-muted">Тайлбар</p>
            <p className="text-sm leading-6 text-foreground">{supplier.description}</p>
          </div>
        )}
      </div>

      {actionError && (
        <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-3 text-xs underline">Хаах</button>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
        <h3 className="mb-4 text-sm font-bold text-foreground">Үйлдэл</h3>
        <div className="flex flex-wrap gap-2">
          {isPending && (
            <>
              <button
                disabled={!!actionLoading}
                onClick={() => void handleStatusUpdate('ACTIVE')}
                className="inline-flex items-center gap-2 rounded-xl bg-success/15 px-4 py-2.5 text-sm font-bold text-success hover:bg-success/25 disabled:opacity-50"
              >
                {actionLoading === 'ACTIVE' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Зөвшөөрөх
              </button>
              <button
                disabled={!!actionLoading}
                onClick={() => void handleStatusUpdate('REJECTED', 'Шаардлага хангаагүй')}
                className="inline-flex items-center gap-2 rounded-xl bg-error/10 px-4 py-2.5 text-sm font-bold text-error hover:bg-error/20 disabled:opacity-50"
              >
                {actionLoading === 'REJECTED' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                Татгалзах
              </button>
            </>
          )}
          {supplier.status === 'ACTIVE' && (
            <button
              disabled={!!actionLoading}
              onClick={() => void handleStatusUpdate('SUSPENDED')}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-500/25 disabled:opacity-50"
            >
              {actionLoading === 'SUSPENDED' ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
              Түр хаах
            </button>
          )}
          {supplier.status === 'SUSPENDED' && (
            <button
              disabled={!!actionLoading}
              onClick={() => void handleStatusUpdate('ACTIVE')}
              className="inline-flex items-center gap-2 rounded-xl bg-success/15 px-4 py-2.5 text-sm font-bold text-success hover:bg-success/25 disabled:opacity-50"
            >
              {actionLoading === 'ACTIVE' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Идэвхжүүлэх
            </button>
          )}
        </div>
      </div>

      {supplier.statusHistory && supplier.statusHistory.length > 0 && (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
          <h3 className="mb-4 text-sm font-bold text-foreground">Төлөв өөрчлөлтийн түүх</h3>
          <div className="space-y-3">
            {supplier.statusHistory.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                <p className="text-sm text-foreground">
                  {STATUS_HISTORY_LABELS[item.status] ?? item.status}
                  {item.reason && <span className="text-foreground-muted"> · {item.reason}</span>}
                </p>
                <p className="ml-auto shrink-0 text-xs text-foreground-muted">
                  {new Date(item.at).toLocaleString('mn-MN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
