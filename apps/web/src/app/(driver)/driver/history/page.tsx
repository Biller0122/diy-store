'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { useDriverStore } from '@/lib/driver-store';
import { vendureShopFetch } from '@/lib/vendure';

type HistoryItem = {
  id: string;
  orderNumber: string;
  customer: string;
  dropoff: string;
  distance: number;
  fee: number;
  rating: number | null;
  date: string;
  status: 'COMPLETED' | 'CANCELLED';
  pickups: number;
};

const HISTORY_QUERY = `
  query DriverHistory($driverId: String!, $limit: Int) {
    deliveryHistoryForDriver(driverId: $driverId, limit: $limit) {
      id
      orderNumber
      customerName
      dropoffAddress
      distance
      finalFee
      proposedFee
      status
      pickupStops { supplierId }
      updatedAt
    }
  }
`;

export default function DriverHistoryPage() {
  const [dateFilter, setDateFilter] = useState('all');
  const { driver } = useDriverStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!driver?.id) return;
    const driverId = driver.id;
    let mounted = true;
    async function loadHistory() {
      try {
        const data = await vendureShopFetch<{
          deliveryHistoryForDriver: Array<{
            id: string;
            orderNumber: string;
            customerName: string;
            dropoffAddress: string;
            distance: number;
            finalFee: number;
            proposedFee: number;
            status: 'COMPLETED' | 'CANCELLED';
            pickupStops: Array<{ supplierId: string }>;
            updatedAt: string;
          }>;
        }>(HISTORY_QUERY, { driverId, limit: 50 });
        if (!mounted) return;
        setHistory(data.deliveryHistoryForDriver.map((item) => ({
          id: item.id,
          orderNumber: item.orderNumber,
          customer: item.customerName || 'Хэрэглэгч',
          dropoff: item.dropoffAddress,
          distance: item.distance,
          fee: item.finalFee || item.proposedFee,
          rating: item.status === 'COMPLETED' ? 5 : null,
          date: new Date(item.updatedAt).toLocaleDateString('mn-MN'),
          status: item.status,
          pickups: item.pickupStops.length,
        })));
        setError('');
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Түүх татахад алдаа гарлаа');
      }
    }
    void loadHistory();
    return () => { mounted = false; };
  }, [driver?.id]);

  const visibleHistory = useMemo(() => history, [history]);
  const completed = visibleHistory.filter((h) => h.status === 'COMPLETED');
  const totalEarnings = completed.reduce((s, h) => s + h.fee, 0);
  const rated = completed.filter((h) => h.rating);
  const avgRating = rated.length ? rated.reduce((s, h) => s + (h.rating ?? 0), 0) / rated.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Хүргэлтийн түүх</h2>
        <p className="text-sm text-foreground-muted mt-0.5">{visibleHistory.length} нийт хүргэлт</p>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Нийт хүргэлт', value: String(completed.length), sub: `${visibleHistory.length - completed.length} цуцлагдсан` },
          { label: 'Нийт орлого', value: `₮${Math.round(totalEarnings / 100).toLocaleString()}`, sub: 'Бүх цаг' },
          { label: 'Дундаж үнэлгээ', value: avgRating.toFixed(1), sub: '⭐' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-card border border-[var(--glass-border)] rounded-2xl p-4 text-center">
            <p className="text-xl font-black text-brand font-mono">{value}</p>
            <p className="text-xs text-foreground-muted mt-1">{label}</p>
            <p className="text-[10px] text-foreground-muted">{sub}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {visibleHistory.length === 0 && (
          <div className="rounded-2xl border border-[var(--glass-border)] bg-card p-8 text-center text-sm text-foreground-muted">
            Дууссан хүргэлт одоогоор алга.
          </div>
        )}
        {visibleHistory.map((item) => (
          <div key={item.id} className="bg-card border border-[var(--glass-border)] rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.status === 'COMPLETED' ? 'bg-success/15' : 'bg-error/15'}`}>
                  {item.status === 'COMPLETED' ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : (
                    <XCircle size={16} className="text-error" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">#{item.orderNumber || item.id}</p>
                  <p className="text-xs text-foreground-muted">{item.customer} · {item.date}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${item.status === 'COMPLETED' ? 'text-success' : 'text-foreground-muted'}`}>
                  {item.status === 'COMPLETED' ? `+₮${Math.round(item.fee / 100).toLocaleString()}` : 'Цуцлагдсан'}
                </p>
                <p className="text-xs text-foreground-muted">{item.distance} км</p>
              </div>
            </div>

            {item.status === 'COMPLETED' && (
              <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <MapPin size={11} /> <span className="truncate max-w-[180px]">{item.dropoff}</span>
                </div>
                {item.rating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} className={i < item.rating! ? 'text-amber fill-amber' : 'text-foreground-muted/30'} fill={i < item.rating! ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
