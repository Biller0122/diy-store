'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';
import { m } from 'framer-motion';
import type { StoreLocation } from '@/components/StoreMap';

const StoreMap = dynamic(() => import('@/components/StoreMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-2xl bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-foreground-muted">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-sm">Газрын зураг ачааллаж байна...</p>
      </div>
    </div>
  ),
});

// ─── Static store data ────────────────────────────────────────

const STORES: StoreLocation[] = [
  {
    id: '1',
    name: 'shoptool.mn Баянзүрх',
    address: 'Баянзүрх дүүрэг, Нарны зам 5, 2-р хороо',
    district: 'Баянзүрх',
    phone: '7711-0001',
    lat: 47.9135,
    lng: 106.9420,
    hours: { weekday: '09:00–20:00', weekend: '10:00–18:00' },
  },
  {
    id: '2',
    name: 'shoptool.mn Сүхбаатар',
    address: 'Сүхбаатар дүүрэг, Бага тойруу 14, 4-р хороо',
    district: 'Сүхбаатар',
    phone: '7711-0002',
    lat: 47.9176,
    lng: 106.9007,
    hours: { weekday: '09:00–20:00', weekend: '10:00–18:00' },
  },
  {
    id: '3',
    name: 'shoptool.mn Хан-Уул',
    address: 'Хан-Уул дүүрэг, Зайсан, 12-р хороо',
    district: 'Хан-Уул',
    phone: '7711-0003',
    lat: 47.8580,
    lng: 106.8710,
    hours: { weekday: '09:00–20:00', weekend: '10:00–18:00' },
  },
  {
    id: '4',
    name: 'shoptool.mn Чингэлтэй',
    address: 'Чингэлтэй дүүрэг, Энхтайваны өргөн чөлөө 3',
    district: 'Чингэлтэй',
    phone: '7711-0004',
    lat: 47.9280,
    lng: 106.8940,
    hours: { weekday: '09:00–20:00', weekend: '10:00–18:00' },
  },
  {
    id: '5',
    name: 'shoptool.mn Баянгол',
    address: 'Баянгол дүүрэг, Чингисийн өргөн чөлөө 8',
    district: 'Баянгол',
    phone: '7711-0005',
    lat: 47.8920,
    lng: 106.8340,
    hours: { weekday: '09:00–20:00', weekend: '10:00–18:00' },
  },
  {
    id: '6',
    name: 'shoptool.mn Налайх',
    address: 'Налайх дүүрэг, Налайхын зам 1',
    district: 'Налайх',
    phone: '7711-0006',
    lat: 47.7566,
    lng: 107.2833,
    hours: { weekday: '09:00–18:00', weekend: '10:00–16:00' },
  },
];

const DISTRICTS = ['Бүгд', 'Баянзүрх', 'Сүхбаатар', 'Хан-Уул', 'Чингэлтэй', 'Баянгол', 'Налайх'];

// ─── Page ─────────────────────────────────────────────────────

export default function StoresPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [district, setDistrict] = useState('Бүгд');
  const [search, setSearch] = useState('');
  const [locating, setLocating] = useState(false);

  const filtered = useMemo(() => {
    return STORES.filter((s) => {
      const matchDistrict = district === 'Бүгд' || s.district === district;
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.address.toLowerCase().includes(search.toLowerCase());
      return matchDistrict && matchSearch;
    });
  }, [district, search]);

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => setLocating(false),
      () => setLocating(false),
    );
  };

  const selected = STORES.find((s) => s.id === selectedId);

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] bg-surface/50 backdrop-blur-sm px-4 py-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-display font-bold text-foreground">
            📍 Салбарын байршил
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Улаанбаатар хотын {STORES.length} салбараас хамгийн ойрыг олж авна уу
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-200px)] min-h-[600px]">

          {/* ── Left Panel ── */}
          <div className="w-full lg:w-96 shrink-0 flex flex-col gap-4 overflow-hidden">

            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Салбар хайх..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-card text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {/* District tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {DISTRICTS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDistrict(d)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    district === d
                      ? 'bg-brand text-white'
                      : 'bg-card border border-[var(--glass-border)] text-foreground-muted hover:border-brand/30'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Geolocate button */}
            <button
              onClick={handleGeolocate}
              disabled={locating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--glass-border)] text-sm font-medium text-foreground-muted hover:border-brand/40 hover:text-foreground transition-colors disabled:opacity-50"
            >
              <span>{locating ? '⏳' : '🎯'}</span>
              {locating ? 'Байршил тодорхойлж байна...' : 'Миний байршил'}
            </button>

            {/* Store list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
              {filtered.length === 0 && (
                <div className="text-center py-12 text-foreground-muted">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-sm">Салбар олдсонгүй</p>
                </div>
              )}
              {filtered.map((store, i) => (
                <m.div
                  key={store.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <button
                    onClick={() => setSelectedId(store.id === selectedId ? null : store.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      selectedId === store.id
                        ? 'border-brand bg-brand/5 ring-1 ring-brand/30'
                        : 'border-[var(--glass-border)] bg-card hover:border-[var(--glass-border-hover)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">{store.name}</p>
                        <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">{store.address}</p>
                        <p className="text-xs text-foreground-muted mt-1">📞 {store.phone}</p>
                      </div>
                      <span className="shrink-0 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
                        Pickup
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-dark rounded-lg px-2 py-1.5">
                        <p className="text-foreground-muted">Да–Ба</p>
                        <p className="text-foreground font-medium">{store.hours.weekday}</p>
                      </div>
                      <div className="bg-dark rounded-lg px-2 py-1.5">
                        <p className="text-foreground-muted">Бя–Ня</p>
                        <p className="text-foreground font-medium">{store.hours.weekend}</p>
                      </div>
                    </div>

                    {selectedId === store.id && (
                      <m.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-[var(--glass-border)]"
                      >
                        <div className="flex gap-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 py-2 text-xs font-semibold text-center rounded-lg border border-[var(--glass-border)] text-foreground-muted hover:text-foreground transition-colors"
                          >
                            🗺️ Замчлах
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Store selection logic for checkout
                              alert(`"${store.name}" салбарыг сонголоо`);
                            }}
                            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
                          >
                            Энэ салбар сонгох
                          </button>
                        </div>
                      </m.div>
                    )}
                  </button>
                </m.div>
              ))}
            </div>
          </div>

          {/* ── Map ── */}
          <div className="flex-1 min-h-[400px] lg:min-h-0 rounded-2xl overflow-hidden border border-[var(--glass-border)]">
            <StoreMap
              stores={STORES}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        {/* Selected store info banner */}
        {selected && (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-card border border-brand/20 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-semibold text-foreground">{selected.name}</p>
                <p className="text-xs text-foreground-muted">{selected.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
                ✓ Pickup боломжтой
              </span>
              <button
                onClick={() => setSelectedId(null)}
                className="text-foreground-muted hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>
          </m.div>
        )}
      </div>
    </div>
  );
}
