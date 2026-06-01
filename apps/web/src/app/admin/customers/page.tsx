'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Pencil, Plus, RefreshCw, Search, Trash2, UserRound, X, XCircle } from 'lucide-react';
import { vendureAdminFetch } from '@/lib/vendure';

interface AdminCustomer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string | null;
  createdAt: string;
  user?: { verified: boolean; lastLogin?: string | null } | null;
}

type CustomerForm = {
  id?: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  password: string;
};

const EMPTY_FORM: CustomerForm = { firstName: '', lastName: '', emailAddress: '', phoneNumber: '', password: '' };

const CUSTOMERS_GQL = `
  query AdminCustomers($options: CustomerListOptions) {
    customers(options: $options) {
      totalItems
      items {
        id firstName lastName emailAddress phoneNumber createdAt
        user { verified lastLogin }
      }
    }
  }
`;

const CREATE_CUSTOMER_GQL = `
  mutation CreateCustomer($input: CreateCustomerInput!, $password: String) {
    createCustomer(input: $input, password: $password) {
      ... on Customer { id }
      ... on EmailAddressConflictError { message }
    }
  }
`;

const UPDATE_CUSTOMER_GQL = `
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      ... on Customer { id }
      ... on EmailAddressConflictError { message }
    }
  }
`;

const DELETE_CUSTOMER_GQL = `
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id) { result message }
  }
`;

function customerName(customer: AdminCustomer) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.emailAddress;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('mn-MN') : '-';
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await vendureAdminFetch<{ customers: { totalItems: number; items: AdminCustomer[] } }>(
        CUSTOMERS_GQL,
        { options: { take: 100, skip: 0, sort: { createdAt: 'DESC' } } },
      );
      setCustomers(data.customers.items);
      setTotal(data.customers.totalItems);
      setLastFetch(new Date());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Хэрэглэгчийн мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCustomers();
    const interval = window.setInterval(() => void fetchCustomers(), 5_000);
    return () => window.clearInterval(interval);
  }, [fetchCustomers]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) => (
      customerName(customer).toLowerCase().includes(needle) ||
      customer.emailAddress.toLowerCase().includes(needle) ||
      (customer.phoneNumber ?? '').includes(search.trim())
    ));
  }, [customers, search]);

  const verifiedCount = customers.filter((customer) => customer.user?.verified).length;

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError('');
  }

  function openEdit(customer: AdminCustomer) {
    setForm({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      emailAddress: customer.emailAddress,
      phoneNumber: customer.phoneNumber ?? '',
      password: '',
    });
    setFormOpen(true);
    setError('');
  }

  async function saveCustomer() {
    setSaving(true);
    setError('');
    try {
      const input = {
        ...(form.id ? { id: form.id } : {}),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        emailAddress: form.emailAddress.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim() || undefined,
      };
      if (form.id) {
        await vendureAdminFetch(UPDATE_CUSTOMER_GQL, { input });
      } else {
        await vendureAdminFetch(CREATE_CUSTOMER_GQL, { input, password: form.password || undefined });
      }
      setFormOpen(false);
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: string) {
    if (!window.confirm('Энэ хэрэглэгчийг устгах уу?')) return;
    setSaving(true);
    try {
      await vendureAdminFetch(DELETE_CUSTOMER_GQL, { id });
      await fetchCustomers();
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
          <h2 className="text-xl font-black text-foreground">Хэрэглэгчид</h2>
          <p className="text-sm text-foreground-muted">
            Нийт: {total} · Баталгаажсан: {verifiedCount}
            {lastFetch && ` · ${lastFetch.toLocaleTimeString('mn-MN')}-д шинэчлэгдсэн`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white">
            <Plus size={14} /> Нэмэх
          </button>
          <button onClick={() => { setLoading(true); void fetchCustomers(); }} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs text-foreground-muted hover:text-foreground disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Шинэчлэх
          </button>
        </div>
      </div>

      {formOpen && (
        <section className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{form.id ? 'Хэрэглэгч засах' : 'Хэрэглэгч нэмэх'}</h3>
            <button onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-foreground-muted hover:bg-white/10"><X size={16} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ['firstName', 'Нэр'],
              ['lastName', 'Овог'],
              ['emailAddress', 'И-мэйл'],
              ['phoneNumber', 'Утас'],
            ].map(([key, label]) => (
              <input key={key} value={String(form[key as keyof CustomerForm] ?? '')} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} placeholder={label} className="rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" />
            ))}
            {!form.id && (
              <input value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Нууц үг" type="password" className="rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" />
            )}
          </div>
          <button onClick={() => void saveCustomer()} disabled={saving} className="mt-3 rounded-xl bg-success px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
            {saving ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </section>
      )}

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Нэр, и-мэйл, утсаар хайх..." className="w-full rounded-xl border border-[var(--glass-border)] bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-8 text-center">
          <UserRound size={32} className="mx-auto mb-3 text-foreground-muted opacity-40" />
          <p className="text-sm text-foreground-muted">Хэрэглэгч олдсонгүй</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-card">
          <div className="grid gap-3 border-b border-[var(--glass-border)] px-4 py-3 text-xs font-bold text-foreground-muted md:grid-cols-[1.2fr_1.4fr_1fr_1fr_120px]">
            <span>Нэр</span><span>И-мэйл</span><span>Утас</span><span>Төлөв</span><span>Үйлдэл</span>
          </div>
          <div className="divide-y divide-[var(--glass-border)]">
            {filtered.map((customer) => (
              <article key={customer.id} className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-[1.2fr_1.4fr_1fr_1fr_120px] md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand"><UserRound size={18} /></div>
                  <div className="min-w-0"><p className="truncate font-bold text-foreground">{customerName(customer)}</p><p className="text-[11px] text-foreground-muted">ID: {customer.id}</p></div>
                </div>
                <p className="truncate text-foreground-muted">{customer.emailAddress}</p>
                <p className="text-foreground-muted">{customer.phoneNumber || '-'}</p>
                <div>
                  {customer.user?.verified ? <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-1 text-[11px] font-bold text-success"><CheckCircle2 size={12} /> Баталгаажсан</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-2 py-1 text-[11px] font-bold text-error"><XCircle size={12} /> Баталгаажаагүй</span>}
                  <p className="mt-1 text-[10px] text-foreground-muted">Сүүлд: {formatDate(customer.user?.lastLogin)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(customer)} className="rounded-lg bg-white/10 p-2 text-foreground-muted hover:text-foreground"><Pencil size={14} /></button>
                  <button onClick={() => void deleteCustomer(customer.id)} className="rounded-lg bg-error/10 p-2 text-error"><Trash2 size={14} /></button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
