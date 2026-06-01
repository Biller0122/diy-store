'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MapPin, Pencil, Plus, RefreshCw, Search, Star, Trash2, X, XCircle } from 'lucide-react';
import { vendureAdminFetch } from '@/lib/vendure';

type DriverStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';

interface ApiDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: string;
  vehiclePlate?: string | null;
  vehicleModel?: string | null;
  status: DriverStatus;
  isOnline: boolean;
  currentLat?: number | null;
  currentLng?: number | null;
  rating: number;
  totalDeliveries: number;
  todayEarnings: number;
  totalEarnings: number;
  bankName?: string | null;
  bankAccount?: string | null;
  createdAt: string;
}

type DriverForm = {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel: string;
  bankName: string;
  bankAccount: string;
  status: DriverStatus;
};

const EMPTY_FORM: DriverForm = {
  firstName: '', lastName: '', phone: '', vehicleType: 'MOTORCYCLE', vehiclePlate: '', vehicleModel: '', bankName: '', bankAccount: '', status: 'ACTIVE',
};

const TABS = ['all', 'ACTIVE', 'PENDING_APPROVAL', 'PENDING_VERIFICATION', 'SUSPENDED'] as const;

const STATUS_META: Record<DriverStatus, { label: string; cls: string; dot: string }> = {
  PENDING_VERIFICATION: { label: 'OTP хүлээж байна', cls: 'bg-blue-500/15 text-blue-400', dot: 'bg-blue-400' },
  PENDING_APPROVAL: { label: 'Хүлээгдэж буй', cls: 'bg-brand/15 text-brand', dot: 'bg-brand' },
  ACTIVE: { label: 'Идэвхтэй', cls: 'bg-success/15 text-success', dot: 'bg-success' },
  SUSPENDED: { label: 'Түдгэлзүүлсэн', cls: 'bg-error/15 text-error', dot: 'bg-error' },
};

const VEHICLE_LABEL: Record<string, string> = {
  MOTORCYCLE: 'Мотоцикл',
  CAR: 'Машин',
  VAN: 'Фургон',
  TRUCK: 'Ачааны машин',
};

const DRIVERS_GQL = `
  query AdminDrivers($status: String) {
    getDriversByStatus(status: $status) {
      id firstName lastName phone vehicleType vehiclePlate vehicleModel status isOnline currentLat currentLng
      rating totalDeliveries todayEarnings totalEarnings bankName bankAccount createdAt
    }
  }
`;

const CREATE_DRIVER_GQL = `
  mutation CreateDriver($input: AdminDriverInput!) {
    adminCreateDriver(input: $input) { id }
  }
`;

const UPDATE_DRIVER_GQL = `
  mutation UpdateDriver($id: ID!, $input: AdminDriverUpdateInput!) {
    adminUpdateDriver(id: $id, input: $input) { id }
  }
`;

const UPDATE_DRIVER_STATUS_GQL = `
  mutation UpdateDriverStatus($id: ID!, $status: String!) {
    adminUpdateDriverStatus(id: $id, status: $status) { id status isOnline }
  }
`;

const DELETE_DRIVER_GQL = `
  mutation DeleteDriver($id: ID!) {
    adminDeleteDriver(id: $id)
  }
`;

function fullName(driver: ApiDriver) {
  return [driver.firstName, driver.lastName].filter(Boolean).join(' ');
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<ApiDriver[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DriverForm>(EMPTY_FORM);

  const fetchDrivers = useCallback(async () => {
    try {
      const data = await vendureAdminFetch<{ getDriversByStatus: ApiDriver[] }>(
        DRIVERS_GQL,
        { status: tab !== 'all' ? tab : undefined },
      );
      setDrivers(data.getDriversByStatus);
      setLastFetch(new Date());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Жолоочийн мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void fetchDrivers();
    const interval = window.setInterval(() => void fetchDrivers(), 5_000);
    return () => window.clearInterval(interval);
  }, [fetchDrivers]);

  const filtered = useMemo(() => drivers.filter((driver) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return fullName(driver).toLowerCase().includes(needle) ||
      driver.phone.includes(search.trim()) ||
      (driver.vehiclePlate ?? '').toLowerCase().includes(needle);
  }), [drivers, search]);

  const activeDrivers = drivers.filter((driver) => driver.status === 'ACTIVE');
  const onlineDrivers = activeDrivers.filter((driver) => driver.isOnline);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError('');
  }

  function openEdit(driver: ApiDriver) {
    setForm({
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      vehiclePlate: driver.vehiclePlate ?? '',
      vehicleModel: driver.vehicleModel ?? '',
      bankName: driver.bankName ?? '',
      bankAccount: driver.bankAccount ?? '',
      status: driver.status,
    });
    setFormOpen(true);
    setError('');
  }

  async function saveDriver() {
    setSaving(true);
    setError('');
    try {
      const input = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim(),
        vehicleType: form.vehicleType,
        vehiclePlate: form.vehiclePlate.trim() || undefined,
        vehicleModel: form.vehicleModel.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
        bankAccount: form.bankAccount.trim() || undefined,
        status: form.status,
      };
      if (form.id) await vendureAdminFetch(UPDATE_DRIVER_GQL, { id: form.id, input });
      else await vendureAdminFetch(CREATE_DRIVER_GQL, { input });
      setFormOpen(false);
      await fetchDrivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: DriverStatus) {
    setSaving(true);
    try {
      await vendureAdminFetch(UPDATE_DRIVER_STATUS_GQL, { id, status });
      await fetchDrivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Төлөв шинэчлэхэд алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDriver(id: string) {
    if (!window.confirm('Энэ жолоочийг устгах уу?')) return;
    setSaving(true);
    try {
      await vendureAdminFetch(DELETE_DRIVER_GQL, { id });
      await fetchDrivers();
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
          <h2 className="text-xl font-black text-foreground">Жолоочид</h2>
          <p className="text-sm text-foreground-muted">
            {drivers.length} нийт · <span className="text-success">{onlineDrivers.length} онлайн</span>
            {lastFetch && ` · ${lastFetch.toLocaleTimeString('mn-MN')}-д шинэчлэгдсэн`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white"><Plus size={14} /> Нэмэх</button>
          <button onClick={() => { setLoading(true); void fetchDrivers(); }} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs text-foreground-muted hover:text-foreground disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Шинэчлэх
          </button>
        </div>
      </div>

      {formOpen && (
        <section className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{form.id ? 'Жолооч засах' : 'Жолооч нэмэх'}</h3>
            <button onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-foreground-muted hover:bg-white/10"><X size={16} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ['firstName', 'Нэр'],
              ['lastName', 'Овог'],
              ['phone', 'Утас'],
              ['vehiclePlate', 'Улсын дугаар'],
              ['vehicleModel', 'Машины загвар'],
              ['bankName', 'Банк'],
              ['bankAccount', 'Данс'],
            ].map(([key, label]) => (
              <input key={key} value={String(form[key as keyof DriverForm] ?? '')} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} placeholder={label} className="rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" />
            ))}
            <select value={form.vehicleType} onChange={(e) => setForm((prev) => ({ ...prev, vehicleType: e.target.value }))} className="rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand">
              {Object.entries(VEHICLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as DriverStatus }))} className="rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand">
              {Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </select>
          </div>
          <button onClick={() => void saveDriver()} disabled={saving} className="mt-3 rounded-xl bg-success px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? 'Хадгалж байна...' : 'Хадгалах'}</button>
        </section>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[['Нийт жолооч', drivers.length], ['Одоо онлайн', onlineDrivers.length], ['Идэвхтэй', activeDrivers.length]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4"><p className="text-2xl font-black text-foreground">{value}</p><p className="text-xs text-foreground-muted">{label}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Нэр, утас, улсын дугаар хайх..." className="w-full rounded-xl border border-[var(--glass-border)] bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((key) => (
            <button key={key} onClick={() => setTab(key)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${tab === key ? 'bg-brand text-white' : 'border border-[var(--glass-border)] bg-card text-foreground-muted hover:text-foreground'}`}>
              {key === 'all' ? 'Бүгд' : STATUS_META[key].label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-8 text-center text-sm text-foreground-muted">Жолоочийн бүртгэл олдсонгүй</div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((driver) => {
            const meta = STATUS_META[driver.status];
            return (
              <article key={driver.id} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div><h3 className="font-black text-foreground">{fullName(driver)}</h3><p className="text-sm text-foreground-muted">{driver.phone}</p></div>
                  <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold ${meta.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
                </div>
                <div className="space-y-2 rounded-2xl bg-white/[0.03] p-3">
                  <p className="text-sm text-foreground">{VEHICLE_LABEL[driver.vehicleType] ?? driver.vehicleType} · {driver.vehiclePlate || '-'}</p>
                  <p className="text-sm text-foreground-muted">{driver.vehicleModel || 'Загвар оруулаагүй'}</p>
                  <p className="flex items-center gap-1 text-sm text-foreground-muted"><Star size={13} className="fill-brand text-brand" /> {driver.rating}</p>
                  <p className="flex items-center gap-1 text-xs text-foreground-muted"><MapPin size={12} />{driver.currentLat != null && driver.currentLng != null ? `${driver.currentLat.toFixed(3)}, ${driver.currentLng.toFixed(3)}` : 'Байршил ирээгүй'}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => openEdit(driver)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground"><Pencil size={13} /></button>
                  {driver.status !== 'ACTIVE' && <button onClick={() => void updateStatus(driver.id, 'ACTIVE')} disabled={saving} className="flex items-center gap-1 rounded-xl bg-success px-3 py-2 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 size={14} /> Идэвхжүүлэх</button>}
                  {driver.status !== 'SUSPENDED' && <button onClick={() => void updateStatus(driver.id, 'SUSPENDED')} disabled={saving} className="flex items-center gap-1 rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-xs font-black text-error disabled:opacity-50"><XCircle size={14} /> Түдгэлзүүлэх</button>}
                  <button onClick={() => void deleteDriver(driver.id)} disabled={saving} className="rounded-xl bg-error/10 px-3 py-2 text-xs font-black text-error disabled:opacity-50"><Trash2 size={14} /></button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
