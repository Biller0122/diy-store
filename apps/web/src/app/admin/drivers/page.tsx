'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MapPin, PauseCircle, RefreshCw, Search, Star } from 'lucide-react';

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

const TABS = [
  ['all', 'Бүгд'],
  ['map', 'Live map'],
  ['ACTIVE', 'Идэвхтэй'],
  ['PENDING_APPROVAL', 'Хүлээгдэж буй'],
  ['PENDING_VERIFICATION', 'OTP хүлээж байна'],
  ['SUSPENDED', 'Түдгэлзүүлсэн'],
] as const;

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

const ADMIN_API = process.env.NEXT_PUBLIC_VENDURE_ADMIN_API ?? 'http://localhost:3001/admin-api';

const DRIVERS_GQL = `
  query AdminDrivers($status: String) {
    drivers(status: $status) {
      id
      firstName
      lastName
      phone
      vehicleType
      vehiclePlate
      vehicleModel
      status
      isOnline
      currentLat
      currentLng
      rating
      totalDeliveries
      todayEarnings
      totalEarnings
      bankName
      bankAccount
      createdAt
    }
  }
`;

const UPDATE_DRIVER_STATUS_GQL = `
  mutation UpdateDriverStatus($id: ID!, $status: String!) {
    updateDriverStatus(id: $id, status: $status) {
      id
      status
      isOnline
    }
  }
`;

async function gqlFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ADMIN_API, {
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

function fullName(driver: ApiDriver) {
  return [driver.firstName, driver.lastName].filter(Boolean).join(' ');
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<ApiDriver[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      const data = await gqlFetch<{ drivers: ApiDriver[] }>(DRIVERS_GQL);
      setDrivers(data.drivers);
      setLastFetch(new Date());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Жолоочийн мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDrivers();
    const interval = window.setInterval(() => void fetchDrivers(), 30_000);
    return () => window.clearInterval(interval);
  }, [fetchDrivers]);

  const filtered = useMemo(() => drivers.filter((driver) => {
    if (tab !== 'all' && tab !== 'map' && driver.status !== tab) return false;
    if (!search) return true;
    const needle = search.toLowerCase();
    return (
      fullName(driver).toLowerCase().includes(needle) ||
      driver.phone.includes(search) ||
      (driver.vehiclePlate ?? '').toLowerCase().includes(needle) ||
      (driver.vehicleModel ?? '').toLowerCase().includes(needle)
    );
  }), [drivers, search, tab]);

  const activeDrivers = drivers.filter((driver) => driver.status === 'ACTIVE');
  const onlineDrivers = activeDrivers.filter((driver) => driver.isOnline);
  const pendingCount = drivers.filter((driver) => driver.status === 'PENDING_APPROVAL').length;

  async function updateStatus(id: string, status: DriverStatus) {
    setActionLoading(`${id}:${status}`);
    setError('');
    try {
      const data = await gqlFetch<{ updateDriverStatus: Pick<ApiDriver, 'id' | 'status' | 'isOnline'> }>(
        UPDATE_DRIVER_STATUS_GQL,
        { id, status },
      );
      setDrivers((current) => current.map((driver) => (
        driver.id === id ? { ...driver, ...data.updateDriverStatus } : driver
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Төлөв шинэчлэхэд алдаа гарлаа');
    } finally {
      setActionLoading(null);
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
        <button
          onClick={() => { setLoading(true); void fetchDrivers(); }}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs text-foreground-muted hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Шинэчлэх
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Нийт жолооч', drivers.length],
          ['Одоо онлайн', onlineDrivers.length],
          ['Хүлээгдэж буй', pendingCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
            <p className="text-2xl font-black text-foreground">{value}</p>
            <p className="text-xs text-foreground-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Нэр, утас, улсын дугаар хайх..."
            className="w-full rounded-xl border border-[var(--glass-border)] bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${
                tab === key ? 'bg-brand text-white' : 'border border-[var(--glass-border)] bg-card text-foreground-muted hover:text-foreground'
              }`}
            >
              {key === 'PENDING_APPROVAL' && pendingCount > 0 ? `${label} (${pendingCount})` : label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
        </div>
      ) : tab === 'map' ? (
        <section className="relative h-[520px] overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[#15191a]">
          <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="absolute left-5 top-5 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur">
            <p className="text-sm font-bold text-foreground">Улаанбаатар live map</p>
            <p className="text-xs text-foreground-muted">Зөвхөн идэвхтэй жолооч харагдана</p>
          </div>
          {activeDrivers.map((driver, index) => (
            <div
              key={driver.id}
              className="group absolute"
              style={{ left: `${30 + index * 14}%`, top: `${35 + (index % 2) * 20}%` }}
            >
              <span className={`block h-5 w-5 rounded-full border-2 border-white shadow-lg ${driver.isOnline ? 'bg-success' : 'bg-foreground-muted'}`} />
              <div className="pointer-events-none absolute bottom-7 left-1/2 hidden w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 p-3 text-xs text-foreground shadow-xl group-hover:block">
                <p className="font-bold">{fullName(driver)}</p>
                <p className="text-foreground-muted">{VEHICLE_LABEL[driver.vehicleType] ?? driver.vehicleType} · {driver.vehiclePlate || '-'}</p>
                <p className="mt-1 text-brand">{driver.isOnline ? 'Онлайн' : 'Офлайн'}</p>
              </div>
            </div>
          ))}
        </section>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-8 text-center text-sm text-foreground-muted">
          Жолоочийн бүртгэл олдсонгүй
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((driver) => {
            const meta = STATUS_META[driver.status];
            const approveLoading = actionLoading === `${driver.id}:ACTIVE`;
            const suspendLoading = actionLoading === `${driver.id}:SUSPENDED`;
            return (
              <article key={driver.id} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-foreground">{fullName(driver)}</h3>
                    <p className="text-sm text-foreground-muted">{driver.phone}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold ${meta.cls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </div>

                <div className="space-y-2 rounded-2xl bg-white/[0.03] p-3">
                  <p className="text-sm text-foreground">
                    {VEHICLE_LABEL[driver.vehicleType] ?? driver.vehicleType} · {driver.vehiclePlate || '-'}
                  </p>
                  <p className="text-sm text-foreground-muted">{driver.vehicleModel || 'Загвар оруулаагүй'}</p>
                  <p className="flex items-center gap-1 text-sm text-foreground-muted">
                    <Star size={13} className="fill-brand text-brand" /> {driver.rating}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    Өнөөдөр: {driver.totalDeliveries} хүргэлт, ₮{Math.round(driver.totalEarnings / 100).toLocaleString()} нийт орлого
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Банк: {driver.bankName || '-'} · {driver.bankAccount || '-'}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-foreground-muted">
                    <MapPin size={12} />
                    {driver.currentLat != null && driver.currentLng != null
                      ? `${driver.currentLat.toFixed(3)}, ${driver.currentLng.toFixed(3)}`
                      : 'Байршил ирээгүй'}
                  </p>
                  <p className="text-[10px] text-foreground-muted">
                    Бүртгэсэн: {new Date(driver.createdAt).toLocaleString('mn-MN')}
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  {(driver.status === 'PENDING_APPROVAL' || driver.status === 'PENDING_VERIFICATION' || driver.status === 'SUSPENDED') && (
                    <button
                      onClick={() => void updateStatus(driver.id, 'ACTIVE')}
                      disabled={!!actionLoading}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-success px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> {approveLoading ? '...' : 'Зөвшөөрөх'}
                    </button>
                  )}
                  {driver.status !== 'SUSPENDED' && (
                    <button
                      onClick={() => void updateStatus(driver.id, 'SUSPENDED')}
                      disabled={!!actionLoading}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-xs font-black text-error disabled:opacity-50"
                    >
                      <PauseCircle size={14} /> {suspendLoading ? '...' : 'Түдгэлзүүлэх'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
