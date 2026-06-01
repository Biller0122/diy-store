'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Pencil, Plus, RefreshCw, Search, Store, Trash2, X, XCircle } from 'lucide-react';
import { vendureAdminFetch } from '@/lib/vendure';

type SupplierStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

interface ApiSupplier {
  id: string;
  businessName: string;
  slug: string;
  ownerName: string;
  phone: string;
  email: string;
  district?: string;
  address?: string;
  registrationNumber?: string;
  commissionRate: number;
  status: SupplierStatus;
  createdAt: string;
}

type SupplierForm = {
  id?: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  district: string;
  address: string;
  registrationNumber: string;
  commissionRate: string;
};

const EMPTY_FORM: SupplierForm = {
  businessName: '', ownerName: '', phone: '', email: '', district: '', address: '', registrationNumber: '', commissionRate: '10',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING_VERIFICATION: { label: 'OTP хүлээж байна', cls: 'bg-blue-500/15 text-blue-400' },
  PENDING_APPROVAL: { label: 'Хүлээгдэж байна', cls: 'bg-amber-500/15 text-amber-400' },
  PENDING: { label: 'Хүлээгдэж байна', cls: 'bg-amber-500/15 text-amber-400' },
  ACTIVE: { label: 'Идэвхтэй', cls: 'bg-success/15 text-success' },
  SUSPENDED: { label: 'Түдгэлзүүлсэн', cls: 'bg-error/15 text-error' },
  REJECTED: { label: 'Татгалзсан', cls: 'bg-error/15 text-error' },
};

const SUPPLIERS_GQL = `
  query AdminGetSuppliers($status: String) {
    getSuppliersByStatus(status: $status) {
      id businessName slug ownerName phone email district address registrationNumber commissionRate status createdAt
    }
  }
`;

const CREATE_SUPPLIER_GQL = `
  mutation CreateSupplier($input: CreateSupplierInput!) {
    createSupplier(input: $input) { id status }
  }
`;

const UPDATE_SUPPLIER_GQL = `
  mutation UpdateSupplier($id: ID!, $input: UpdateSupplierInput!) {
    updateSupplier(id: $id, input: $input) { id status }
  }
`;

const UPDATE_STATUS_GQL = `
  mutation AdminUpdateSupplierStatus($id: ID!, $status: String!) {
    adminUpdateSupplierStatus(id: $id, status: $status) { id status }
  }
`;

const DELETE_SUPPLIER_GQL = `
  mutation DeleteSupplier($id: ID!) {
    deleteSupplier(id: $id)
  }
`;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9\u0400-\u04ff-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || `supplier-${Date.now()}`;
}

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupplierStatus>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await vendureAdminFetch<{ getSuppliersByStatus: ApiSupplier[] }>(
        SUPPLIERS_GQL,
        { status: statusFilter === 'all' ? undefined : statusFilter },
      );
      setSuppliers(data.getSuppliersByStatus);
      setLastFetch(new Date());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Нийлүүлэгчийн мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchSuppliers();
    const interval = window.setInterval(() => void fetchSuppliers(), 5_000);
    return () => window.clearInterval(interval);
  }, [fetchSuppliers]);

  const filtered = useMemo(() => suppliers.filter((supplier) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return supplier.businessName.toLowerCase().includes(needle) ||
      supplier.ownerName.toLowerCase().includes(needle) ||
      supplier.phone.includes(search.trim()) ||
      supplier.email.toLowerCase().includes(needle);
  }), [suppliers, search]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError('');
  }

  function openEdit(supplier: ApiSupplier) {
    setForm({
      id: supplier.id,
      businessName: supplier.businessName,
      ownerName: supplier.ownerName,
      phone: supplier.phone,
      email: supplier.email,
      district: supplier.district ?? '',
      address: supplier.address ?? '',
      registrationNumber: supplier.registrationNumber ?? '',
      commissionRate: String(supplier.commissionRate ?? 10),
    });
    setFormOpen(true);
    setError('');
  }

  async function saveSupplier() {
    setSaving(true);
    setError('');
    try {
      if (form.id) {
        await vendureAdminFetch(UPDATE_SUPPLIER_GQL, {
          id: form.id,
          input: {
            businessName: form.businessName.trim(),
            ownerName: form.ownerName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim() || undefined,
            district: form.district.trim() || undefined,
            commissionRate: Number(form.commissionRate || 10),
          },
        });
      } else {
        await vendureAdminFetch(CREATE_SUPPLIER_GQL, {
          input: {
            businessName: form.businessName.trim(),
            slug: slugify(form.businessName),
            ownerName: form.ownerName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim().toLowerCase(),
            address: form.address.trim() || undefined,
            district: form.district.trim() || undefined,
            registrationNumber: form.registrationNumber.trim() || undefined,
            commissionRate: Number(form.commissionRate || 10),
          },
        });
      }
      setFormOpen(false);
      await fetchSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: SupplierStatus) {
    setSaving(true);
    try {
      await vendureAdminFetch(UPDATE_STATUS_GQL, { id, status });
      await fetchSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Төлөв солиход алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier(id: string) {
    if (!window.confirm('Энэ нийлүүлэгчийг устгах уу? Бараанууд нь хамт устна.')) return;
    setSaving(true);
    try {
      await vendureAdminFetch(DELETE_SUPPLIER_GQL, { id });
      await fetchSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Устгахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Нийлүүлэгчид</h2>
          <p className="mt-0.5 text-sm text-foreground-muted">
            Нийт бүртгэл: {suppliers.length}{lastFetch && ` · ${lastFetch.toLocaleTimeString('mn-MN')}-д шинэчлэгдсэн`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white"><Plus size={14} /> Нэмэх</button>
          <button onClick={() => { setLoading(true); void fetchSuppliers(); }} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs text-foreground-muted hover:text-foreground disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Шинэчлэх
          </button>
        </div>
      </div>

      {formOpen && (
        <section className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{form.id ? 'Нийлүүлэгч засах' : 'Нийлүүлэгч нэмэх'}</h3>
            <button onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-foreground-muted hover:bg-white/10"><X size={16} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ['businessName', 'Байгууллагын нэр'],
              ['ownerName', 'Эзэмшигч'],
              ['phone', 'Утас'],
              ['email', 'И-мэйл'],
              ['district', 'Дүүрэг'],
              ['address', 'Хаяг'],
              ['registrationNumber', 'Регистр'],
              ['commissionRate', 'Комисс %'],
            ].map(([key, label]) => (
              <input key={key} disabled={key === 'email' && !!form.id} value={String(form[key as keyof SupplierForm] ?? '')} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} placeholder={label} className="rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand disabled:opacity-60" />
            ))}
          </div>
          <button onClick={() => void saveSupplier()} disabled={saving} className="mt-3 rounded-xl bg-success px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? 'Хадгалж байна...' : 'Хадгалах'}</button>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Нэр, утас, и-мэйл хайх..." className="w-full rounded-xl border border-[var(--glass-border)] bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const).map((key) => (
            <button key={key} onClick={() => setStatusFilter(key)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${statusFilter === key ? 'bg-brand text-white' : 'border border-[var(--glass-border)] bg-card text-foreground-muted hover:text-foreground'}`}>
              {key === 'all' ? 'Бүгд' : STATUS_META[key].label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-8 text-center"><Store size={32} className="mx-auto mb-3 text-foreground-muted opacity-40" /><p className="text-sm text-foreground-muted">Бүртгэл олдсонгүй</p></div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((supplier) => {
            const meta = STATUS_META[supplier.status] ?? { label: supplier.status, cls: 'bg-foreground-muted/15 text-foreground-muted' };
            return (
              <article key={supplier.id} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand"><Store size={22} /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-foreground">{supplier.businessName}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${meta.cls}`}>{meta.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-foreground-muted">{supplier.ownerName} · {supplier.phone} · {supplier.email}</p>
                      <p className="mt-1 text-[10px] text-foreground-muted">Комисс: {supplier.commissionRate}% · {new Date(supplier.createdAt).toLocaleString('mn-MN')}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/suppliers/${supplier.id}`} className="rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground">Дэлгэрэнгүй</Link>
                    <button onClick={() => openEdit(supplier)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground"><Pencil size={13} /></button>
                    {supplier.status !== 'ACTIVE' && <button disabled={saving} onClick={() => void updateStatus(supplier.id, 'ACTIVE')} className="inline-flex items-center gap-1.5 rounded-xl bg-success/15 px-3 py-2 text-xs font-semibold text-success disabled:opacity-50"><CheckCircle2 size={13} />Идэвхжүүлэх</button>}
                    {supplier.status !== 'SUSPENDED' && <button disabled={saving} onClick={() => void updateStatus(supplier.id, 'SUSPENDED')} className="inline-flex items-center gap-1.5 rounded-xl bg-error/10 px-3 py-2 text-xs font-semibold text-error disabled:opacity-50"><XCircle size={13} />Түдгэлзүүлэх</button>}
                    <button disabled={saving} onClick={() => void deleteSupplier(supplier.id)} className="rounded-xl bg-error/10 px-3 py-2 text-xs font-semibold text-error disabled:opacity-50"><Trash2 size={13} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
