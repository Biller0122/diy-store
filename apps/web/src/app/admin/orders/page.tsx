'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, RefreshCw, Search } from 'lucide-react';
import { vendureAdminFetch } from '@/lib/vendure';

interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
  source: string;
  itemSummary?: string | null;
}

const ORDERS_GQL = `
  query AdminOrders($page: Int, $limit: Int) {
    getAllOrders(page: $page, limit: $limit) {
      total
      items {
        id
        orderNumber
        customerName
        total
        status
        createdAt
        source
        itemSummary
      }
    }
  }
`;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PaymentAuthorized: { label: 'Хүлээгдэж буй', cls: 'bg-blue-500/15 text-blue-400' },
  PaymentSettled: { label: 'Боловсруулж буй', cls: 'bg-green-500/15 text-green-400' },
  Shipped: { label: 'Илгээсэн', cls: 'bg-purple-500/15 text-purple-400' },
  Delivered: { label: 'Хүргэгдсэн', cls: 'bg-emerald-500/15 text-emerald-400' },
  Cancelled: { label: 'Цуцлагдсан', cls: 'bg-red-500/15 text-red-400' },
  SEARCHING: { label: 'Жолооч хайж байна', cls: 'bg-amber-500/15 text-amber-400' },
  IN_PROGRESS: { label: 'Хүргэж байна', cls: 'bg-purple-500/15 text-purple-400' },
  COMPLETED: { label: 'Хүргэгдсэн', cls: 'bg-emerald-500/15 text-emerald-400' },
  CANCELLED: { label: 'Цуцлагдсан', cls: 'bg-red-500/15 text-red-400' },
};

function money(amount: number) {
  return `₮${Math.round(amount / 100).toLocaleString('mn-MN')}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await vendureAdminFetch<{ getAllOrders: { total: number; items: AdminOrderSummary[] } }>(
        ORDERS_GQL,
        { page: 1, limit: 100 },
      );
      setOrders(data.getAllOrders.items);
      setTotal(data.getAllOrders.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Захиалга татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) => (
      order.orderNumber.toLowerCase().includes(needle) ||
      order.customerName.toLowerCase().includes(needle) ||
      order.status.toLowerCase().includes(needle)
    ));
  }, [orders, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground">Захиалгууд</h2>
          <p className="text-sm text-foreground-muted">Нийт {total} захиалга</p>
        </div>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs text-foreground-muted hover:text-foreground"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Шинэчлэх
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Захиалгын дугаар, хэрэглэгч, төлөв хайх..."
          className="w-full rounded-xl border border-[var(--glass-border)] bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-card">
        <div className="grid grid-cols-[1fr_1.2fr_1.5fr_1fr_1fr_1fr_40px] gap-3 border-b border-[var(--glass-border)] px-4 py-3 text-xs font-bold text-foreground-muted">
          <span>Дугаар</span>
          <span>Хэрэглэгч</span>
          <span>Бараа</span>
          <span>Нийт</span>
          <span>Төлөв</span>
          <span>Огноо</span>
          <span />
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-foreground-muted">Захиалга олдсонгүй</div>
        ) : (
          <div className="divide-y divide-[var(--glass-border)]">
            {filtered.map((order) => {
              const meta = STATUS_META[order.status] ?? { label: order.status, cls: 'bg-white/10 text-foreground-muted' };
              return (
                <Link
                  key={order.id}
                  href={order.source === 'delivery' ? '/admin/deliveries' : `/admin/orders/${order.id}`}
                  className="grid grid-cols-1 gap-2 px-4 py-4 text-sm hover:bg-white/[0.02] md:grid-cols-[1fr_1.2fr_1.5fr_1fr_1fr_1fr_40px] md:items-center"
                >
                  <span className="font-mono font-bold text-brand">
                    {order.orderNumber}
                    {order.source === 'delivery' && <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-[10px] text-brand">delivery</span>}
                  </span>
                  <span className="text-foreground-muted">{order.customerName || '-'}</span>
                  <span className="truncate text-xs text-foreground-muted">{order.itemSummary || '-'}</span>
                  <span className="font-bold text-foreground">{money(order.total)}</span>
                  <span className={`w-fit rounded-full px-2 py-1 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
                  <span className="text-xs text-foreground-muted">{new Date(order.createdAt).toLocaleString('mn-MN')}</span>
                  <ChevronRight size={15} className="hidden text-foreground-muted md:block" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
