'use client';

import { useState } from 'react';
import { CheckCircle2, MapPin, PauseCircle, Star } from 'lucide-react';

type DriverStatus = 'ONLINE' | 'DELIVERING' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'OFFLINE';

const INITIAL_DRIVERS = [
  { id: 'drv-001', name: 'Анхбаяр Дамдин', phone: '88001122', vehicleType: 'Мотоцикл', plate: '2345-УБА', status: 'ONLINE' as DriverStatus, todayDeliveries: 7, todayEarnings: 2450000, rating: 4.9, lat: 47.922, lng: 106.918 },
  { id: 'drv-002', name: 'Ганбат Нямдорж', phone: '88003344', vehicleType: 'Машин', plate: '3456-УББ', status: 'DELIVERING' as DriverStatus, todayDeliveries: 4, todayEarnings: 1850000, rating: 4.8, lat: 47.914, lng: 106.937 },
  { id: 'drv-003', name: 'Батболд', phone: '99112233', vehicleType: 'Мэдээлэл хүлээгдэж байна', plate: '-', status: 'PENDING_APPROVAL' as DriverStatus, todayDeliveries: 0, todayEarnings: 0, rating: 5, lat: 47.93, lng: 106.905 },
  { id: 'drv-004', name: 'Сүхбат Энх', phone: '88114455', vehicleType: 'Ван', plate: '5678-УБВ', status: 'SUSPENDED' as DriverStatus, todayDeliveries: 0, todayEarnings: 0, rating: 4.5, lat: 47.904, lng: 106.915 },
  { id: 'drv-005', name: 'Нарантуяа Болд', phone: '99009900', vehicleType: 'Машин', plate: '9012-УБГ', status: 'OFFLINE' as DriverStatus, todayDeliveries: 0, todayEarnings: 0, rating: 4.7, lat: 47.934, lng: 106.947 },
];

const TABS = [
  ['all', 'Бүгд'],
  ['map', 'Live map'],
  ['ONLINE', 'Онлайн'],
  ['PENDING_APPROVAL', 'Хүлээгдэж буй'],
  ['SUSPENDED', 'Түдгэлзүүлсэн'],
] as const;

const STATUS_META: Record<DriverStatus, { label: string; cls: string; dot: string }> = {
  ONLINE: { label: 'Онлайн', cls: 'bg-success/15 text-success', dot: 'bg-success' },
  DELIVERING: { label: 'Хүргэлт хийж байна', cls: 'bg-orange-500/15 text-orange-300', dot: 'bg-orange-400' },
  PENDING_APPROVAL: { label: 'Хүлээгдэж буй', cls: 'bg-brand/15 text-brand', dot: 'bg-brand' },
  SUSPENDED: { label: 'Түдгэлзүүлсэн', cls: 'bg-error/15 text-error', dot: 'bg-error' },
  OFFLINE: { label: 'Офлайн', cls: 'bg-white/10 text-foreground-muted', dot: 'bg-foreground-muted' },
};

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('all');

  const filtered = drivers.filter((driver) => {
    if (tab === 'all' || tab === 'map') return true;
    if (tab === 'ONLINE') return driver.status === 'ONLINE' || driver.status === 'DELIVERING';
    return driver.status === tab;
  });
  const onlineDrivers = drivers.filter((driver) => driver.status === 'ONLINE' || driver.status === 'DELIVERING');

  function updateStatus(id: string, status: DriverStatus) {
    setDrivers((current) => current.map((driver) => (driver.id === id ? { ...driver, status } : driver)));
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-foreground">Жолоочид</h2>
        <p className="text-sm text-foreground-muted">
          {drivers.length} нийт · <span className="text-success">{onlineDrivers.length} онлайн</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Нийт жолооч', drivers.length],
          ['Одоо онлайн', onlineDrivers.length],
          ['Хүлээгдэж буй', drivers.filter((driver) => driver.status === 'PENDING_APPROVAL').length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
            <p className="text-2xl font-black text-foreground">{value}</p>
            <p className="text-xs text-foreground-muted">{label}</p>
          </div>
        ))}
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
            {label}
          </button>
        ))}
      </div>

      {tab === 'map' ? (
        <section className="relative h-[520px] overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[#15191a]">
          <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="absolute left-5 top-5 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur">
            <p className="text-sm font-bold text-foreground">Улаанбаатар live map</p>
            <p className="text-xs text-foreground-muted">Ногоон: сул · Улбар: хүргэлтэд</p>
          </div>
          {onlineDrivers.map((driver, index) => (
            <div
              key={driver.id}
              className="group absolute"
              style={{ left: `${30 + index * 16}%`, top: `${35 + (index % 2) * 22}%` }}
            >
              <span className={`block h-5 w-5 rounded-full border-2 border-white shadow-lg ${driver.status === 'ONLINE' ? 'bg-success' : 'bg-orange-400'}`} />
              <div className="pointer-events-none absolute bottom-7 left-1/2 hidden w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 p-3 text-xs text-foreground shadow-xl group-hover:block">
                <p className="font-bold">{driver.name}</p>
                <p className="text-foreground-muted">{driver.vehicleType} · {driver.plate}</p>
                <p className="mt-1 text-brand">Өнөөдөр: {driver.todayDeliveries} хүргэлт</p>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((driver) => {
            const meta = STATUS_META[driver.status];
            return (
              <article key={driver.id} className="rounded-2xl border border-[var(--glass-border)] bg-card p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-foreground">{driver.name}</h3>
                    <p className="text-sm text-foreground-muted">{driver.phone}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold ${meta.cls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </div>

                <div className="space-y-2 rounded-2xl bg-white/[0.03] p-3">
                  <p className="text-sm text-foreground">{driver.vehicleType} · {driver.plate}</p>
                  <p className="flex items-center gap-1 text-sm text-foreground-muted"><Star size={13} className="fill-brand text-brand" /> {driver.rating}</p>
                  <p className="text-sm text-foreground-muted">Өнөөдөр: {driver.todayDeliveries} хүргэлт, ₮{Math.round(driver.todayEarnings / 100).toLocaleString()} орлого</p>
                  <p className="flex items-center gap-1 text-xs text-foreground-muted"><MapPin size={12} /> {driver.lat.toFixed(3)}, {driver.lng.toFixed(3)}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  {driver.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => updateStatus(driver.id, 'OFFLINE')}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-success px-3 py-2 text-xs font-black text-white"
                    >
                      <CheckCircle2 size={14} /> Зөвшөөрөх
                    </button>
                  )}
                  {driver.status !== 'SUSPENDED' ? (
                    <button
                      onClick={() => updateStatus(driver.id, 'SUSPENDED')}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-xs font-black text-error"
                    >
                      <PauseCircle size={14} /> Түдгэлзүүлэх
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(driver.id, 'OFFLINE')}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-black text-white"
                    >
                      Сэргээх
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
