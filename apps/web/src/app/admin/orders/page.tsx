'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Clock, MapPin, Package, Phone, RefreshCw, Search, Store, Truck, User, X } from 'lucide-react';
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

interface DeliveryOrderItem {
  supplierId: string;
  supplierName: string;
  productId?: string | null;
  variantId?: string | null;
  name: string;
  sku?: string | null;
  qty: number;
  price: number;
}

interface PickupStop {
  supplierId: string;
  supplierName: string;
  district?: string | null;
  address: string;
  phone?: string | null;
  status: string;
}

interface DeliveryDetail {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickupStops: PickupStop[];
  orderItems: DeliveryOrderItem[];
  orderTotal: number;
  paymentMethod?: string | null;
  supplierStatus: string;
  dropoffAddress: string;
  distance: number;
  estimatedDuration: number;
  proposedFee: number;
  finalFee: number;
  status: string;
  driverId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DriverDetail {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: string;
  vehiclePlate?: string | null;
  rating: number;
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

const DELIVERY_DETAIL_GQL = `
  query DeliveryDetail($orderId: String!) {
    deliveryRequest(orderId: $orderId) {
      id
      orderId
      orderNumber
      customerId
      customerName
      customerPhone
      pickupStops { supplierId supplierName district address phone status }
      orderItems { supplierId supplierName productId variantId name sku qty price }
      orderTotal
      paymentMethod
      supplierStatus
      dropoffAddress
      distance
      estimatedDuration
      proposedFee
      finalFee
      status
      driverId
      createdAt
      updatedAt
    }
  }
`;

const DRIVER_DETAIL_GQL = `
  query DriverDetail($id: ID!) {
    getDriverProfile(id: $id) {
      id
      firstName
      lastName
      phone
      vehicleType
      vehiclePlate
      rating
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

function minutesBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.max(0, Math.round(diff / 60_000));
}

function statusLabel(status: string) {
  return STATUS_META[status]?.label ?? status;
}

function driverName(driver?: DriverDetail | null) {
  if (!driver) return 'Жолооч оноогдоогүй';
  return [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Жолооч';
}

function groupItemsBySupplier(items: DeliveryOrderItem[]) {
  const groups = new Map<string, { supplierName: string; items: DeliveryOrderItem[] }>();
  for (const item of items) {
    const key = item.supplierId || item.supplierName || 'unknown';
    const group = groups.get(key) ?? { supplierName: item.supplierName || 'Дэлгүүр', items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return Array.from(groups.values());
}

function DeliveryDetailDrawer({
  order,
  detail,
  driver,
  loading,
  error,
  onClose,
}: {
  order: AdminOrderSummary | null;
  detail: DeliveryDetail | null;
  driver: DriverDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  if (!order) return null;
  const elapsedMinutes = detail ? minutesBetween(detail.createdAt, detail.updatedAt) : 0;
  const itemGroups = detail ? groupItemsBySupplier(detail.orderItems) : [];
  const timeline = [
    { key: 'created', label: 'Захиалга үүссэн', value: detail?.createdAt },
    { key: 'accepted', label: 'Жолооч авсан', value: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(detail?.status ?? '') ? detail?.updatedAt : null },
    { key: 'completed', label: 'Хүргэлт дууссан', value: detail?.status === 'COMPLETED' ? detail.updatedAt : null },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Хаах" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-[var(--glass-border)] bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--glass-border)] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-foreground-muted">Захиалгын дэлгэрэнгүй</p>
            <h3 className="mt-1 font-mono text-xl font-black text-brand">{order.orderNumber}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-foreground-muted hover:bg-white/5 hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-brand" />
          </div>
        ) : error ? (
          <div className="m-5 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
        ) : detail ? (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--glass-border)] bg-surface p-4">
                <p className="flex items-center gap-2 text-xs text-foreground-muted"><Package size={14} /> Нийт дүн</p>
                <p className="mt-2 text-xl font-black text-foreground">{money(detail.orderTotal)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--glass-border)] bg-surface p-4">
                <p className="flex items-center gap-2 text-xs text-foreground-muted"><Clock size={14} /> Хугацаа</p>
                <p className="mt-2 text-xl font-black text-foreground">{elapsedMinutes} мин</p>
                <p className="text-[11px] text-foreground-muted">Тооцоо: {detail.estimatedDuration} мин</p>
              </div>
              <div className="rounded-2xl border border-[var(--glass-border)] bg-surface p-4">
                <p className="flex items-center gap-2 text-xs text-foreground-muted"><Truck size={14} /> Төлөв</p>
                <p className="mt-2 text-sm font-black text-foreground">{statusLabel(detail.status)}</p>
                <p className="text-[11px] text-foreground-muted">{detail.distance.toFixed(1)} км</p>
              </div>
            </div>

            <section className="rounded-2xl border border-[var(--glass-border)] bg-surface p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-foreground"><User size={16} /> Хэрэглэгч</h4>
              <div className="grid gap-2 text-sm text-foreground-muted sm:grid-cols-2">
                <p><span className="text-foreground">Нэр:</span> {detail.customerName || '-'}</p>
                <p><span className="text-foreground">Утас:</span> {detail.customerPhone || '-'}</p>
                <p className="sm:col-span-2"><span className="text-foreground">Хүргэх хаяг:</span> {detail.dropoffAddress}</p>
                <p><span className="text-foreground">Төлбөр:</span> {detail.paymentMethod || '-'}</p>
                <p><span className="text-foreground">Нийлүүлэгчийн төлөв:</span> {detail.supplierStatus}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--glass-border)] bg-surface p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-foreground"><Truck size={16} /> Жолооч ба хүргэлт</h4>
              <div className="grid gap-2 text-sm text-foreground-muted sm:grid-cols-2">
                <p><span className="text-foreground">Жолооч:</span> {driverName(driver)}</p>
                <p><span className="text-foreground">Утас:</span> {driver?.phone || '-'}</p>
                <p><span className="text-foreground">Унаа:</span> {driver?.vehicleType || '-'} {driver?.vehiclePlate ? `· ${driver.vehiclePlate}` : ''}</p>
                <p><span className="text-foreground">Үнэлгээ:</span> {driver?.rating ?? '-'}</p>
                <p><span className="text-foreground">Хүргэлтийн үнэ:</span> {money(detail.finalFee || detail.proposedFee)}</p>
                <p><span className="text-foreground">Зай:</span> {detail.distance.toFixed(1)} км</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--glass-border)] bg-surface p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-foreground"><Store size={16} /> Дэлгүүр ба бараа</h4>
              <div className="space-y-4">
                {itemGroups.map((group) => {
                  const stop = detail.pickupStops.find((pickup) => pickup.supplierName === group.supplierName || pickup.supplierId === group.items[0]?.supplierId);
                  return (
                    <div key={group.supplierName} className="rounded-xl border border-[var(--glass-border)] bg-card/60 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-foreground">{group.supplierName}</p>
                          <p className="flex items-center gap-1 text-xs text-foreground-muted"><MapPin size={12} /> {stop?.address || 'Хаяг оруулаагүй'}</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold text-foreground-muted">
                          {stop?.status || 'PENDING'}
                        </span>
                      </div>
                      <div className="divide-y divide-[var(--glass-border)]">
                        {group.items.map((item) => (
                          <div key={`${item.name}-${item.variantId ?? item.productId ?? item.sku ?? item.qty}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <div>
                              <p className="text-foreground">{item.name}</p>
                              <p className="text-xs text-foreground-muted">{item.sku || item.variantId || item.productId || '-'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-foreground">{money(item.price * item.qty)}</p>
                              <p className="text-xs text-foreground-muted">{money(item.price)} × {item.qty}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--glass-border)] bg-surface p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-foreground"><Clock size={16} /> Явц ба хугацаа</h4>
              <div className="space-y-3">
                {timeline.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${item.value ? 'bg-brand' : 'bg-foreground-muted/30'}`} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-foreground-muted">{item.value ? new Date(item.value).toLocaleString('mn-MN') : 'Хүлээгдэж байна'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="py-20 text-center text-sm text-foreground-muted">Дэлгэрэнгүй мэдээлэл олдсонгүй.</div>
        )}
      </aside>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderSummary | null>(null);
  const [deliveryDetail, setDeliveryDetail] = useState<DeliveryDetail | null>(null);
  const [driverDetail, setDriverDetail] = useState<DriverDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

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

  const openDeliveryDetail = useCallback(async (order: AdminOrderSummary) => {
    setSelectedOrder(order);
    setDeliveryDetail(null);
    setDriverDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const data = await vendureAdminFetch<{ deliveryRequest: DeliveryDetail | null }>(
        DELIVERY_DETAIL_GQL,
        { orderId: order.orderNumber || order.id },
      );
      const detail = data.deliveryRequest;
      setDeliveryDetail(detail);
      if (detail?.driverId) {
        const driverData = await vendureAdminFetch<{ getDriverProfile: DriverDetail | null }>(
          DRIVER_DETAIL_GQL,
          { id: detail.driverId },
        );
        setDriverDetail(driverData.getDriverProfile);
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Захиалгын дэлгэрэнгүй татахад алдаа гарлаа');
    } finally {
      setDetailLoading(false);
    }
  }, []);

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
                <div
                  key={order.id}
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
                  {order.source === 'delivery' ? (
                    <button
                      onClick={() => void openDeliveryDetail(order)}
                      className="hidden rounded-lg p-2 text-foreground-muted hover:bg-white/5 hover:text-brand md:block"
                      aria-label="Дэлгэрэнгүй харах"
                    >
                      <ChevronRight size={15} />
                    </button>
                  ) : (
                    <Link href={`/admin/orders/${order.id}`} className="hidden rounded-lg p-2 text-foreground-muted hover:bg-white/5 hover:text-brand md:block">
                      <ChevronRight size={15} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DeliveryDetailDrawer
        order={selectedOrder}
        detail={deliveryDetail}
        driver={driverDetail}
        loading={detailLoading}
        error={detailError}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
