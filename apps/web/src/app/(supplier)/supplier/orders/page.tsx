'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronRight, Clock, CheckCircle2, Truck } from 'lucide-react';
import { vendureShopFetch } from '@/lib/vendure';
import { useSupplierStore } from '@/lib/supplier-store';

type SupplierOrder = {
  id: string;
  customer: string;
  phone: string;
  address: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: string;
  createdAt: string;
};

const DELIVERY_ORDERS_QUERY = `
  query SupplierDeliveryOrders($supplierId: String!) {
    supplierDeliveryRequests(supplierId: $supplierId) {
      id
      orderId
      orderNumber
      customerName
      customerPhone
      dropoffAddress
      orderTotal
      supplierStatus
      status
      createdAt
      orderItems {
        supplierId
        name
        qty
        price
      }
    }
  }
`;

const SUPPLIER_DELIVERY_ACTION = `
  mutation SupplierDeliveryAction($deliveryId: ID!, $supplierId: String!, $action: String!) {
    supplierDeliveryAction(deliveryId: $deliveryId, supplierId: $supplierId, action: $action) {
      success
      message
    }
  }
`;

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:              { label: 'Шинэ',           cls: 'bg-brand/15 text-brand',         icon: Clock },
  ACCEPTED_BY_SUPPLIER: { label: 'Баталсан',       cls: 'bg-blue-500/15 text-blue-400',   icon: CheckCircle2 },
  DRIVER_ASSIGNED:      { label: 'Жолооч',         cls: 'bg-purple-500/15 text-purple-400', icon: Truck },
  ON_THE_WAY:           { label: 'Хүргэж байна',   cls: 'bg-amber/15 text-amber',         icon: Truck },
  DELIVERED:            { label: 'Хүргэгдсэн',     cls: 'bg-success/15 text-success',     icon: CheckCircle2 },
};

const TABS = [
  { key: 'all', label: 'Бүгд' },
  { key: 'PENDING', label: 'Шинэ' },
  { key: 'ACCEPTED_BY_SUPPLIER', label: 'Баталсан' },
  { key: 'ON_THE_WAY', label: 'Хүргэж байна' },
  { key: 'DELIVERED', label: 'Дууссан' },
];

export default function SupplierOrdersPage() {
  const { supplier } = useSupplierStore();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const supplierId = supplier?.id;

  async function loadOrders() {
    if (!supplierId) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      const data = await vendureShopFetch<{
        supplierDeliveryRequests: {
          id: string;
          orderId: string;
          orderNumber: string;
          customerName: string;
          customerPhone: string;
          dropoffAddress: string;
          orderTotal: number;
          supplierStatus: string;
          status: string;
          createdAt: string;
          orderItems: { supplierId: string; name: string; qty: number; price: number }[];
        }[];
      }>(DELIVERY_ORDERS_QUERY, { supplierId });
      setOrders(data.supplierDeliveryRequests.map((order) => {
        const items = order.orderItems.filter((item) => String(item.supplierId) === String(supplierId));
        const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
        const status =
          order.status === 'COMPLETED' ? 'DELIVERED' :
          order.status === 'IN_PROGRESS' ? 'ON_THE_WAY' :
          order.status === 'ACCEPTED' ? 'DRIVER_ASSIGNED' :
          order.supplierStatus === 'ACCEPTED' ? 'ACCEPTED_BY_SUPPLIER' :
          order.supplierStatus === 'REJECTED' ? 'REJECTED' :
          'PENDING';
        return {
          id: order.id,
          customer: order.customerName || 'Хэрэглэгч',
          phone: order.customerPhone,
          address: order.dropoffAddress,
          items,
          total: total || order.orderTotal,
          status,
          createdAt: new Date(order.createdAt).toLocaleString('mn-MN'),
        };
      }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Захиалга татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    if (mounted) void loadOrders();
    const interval = window.setInterval(() => void loadOrders(), 30_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [supplierId]);

  const filtered = orders.filter((o) => {
    if (tab !== 'all' && o.status !== tab) return false;
    if (search && !o.customer.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleAction(orderId: string, action: 'ACCEPT' | 'REJECT') {
    if (!supplierId) return;
    setSavingId(`${orderId}:${action}`);
    try {
      const data = await vendureShopFetch<{ supplierDeliveryAction: { success: boolean; message: string } }>(
        SUPPLIER_DELIVERY_ACTION,
        { deliveryId: orderId, supplierId, action },
      );
      if (!data.supplierDeliveryAction.success) throw new Error(data.supplierDeliveryAction.message);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Захиалга шинэчлэхэд алдаа гарлаа');
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Захиалгууд</h2>
          <p className="text-sm text-foreground-muted mt-0.5">{loading ? 'Синк хийж байна...' : `${orders.length} нийт захиалга`}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => {
          const count = t.key === 'all' ? orders.length : orders.filter((o) => o.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${tab === t.key ? 'bg-brand text-white' : 'bg-card border border-[var(--glass-border)] text-foreground-muted hover:text-foreground'}`}
            >
              {t.label}
              {count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-foreground-muted/15'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Захиалга хайх..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-[var(--glass-border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* Order list */}
      <div className="space-y-2">
        {filtered.map((order) => {
          const meta = STATUS_META[order.status] ?? { label: order.status, cls: 'bg-white/10 text-foreground-muted', icon: Clock };
          const StatusIcon = meta.icon;
          const isExpanded = expanded === order.id;

          return (
            <div key={order.id} className="bg-card border border-[var(--glass-border)] rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-4 hover:bg-white/2 transition-colors text-left"
                onClick={() => setExpanded(isExpanded ? null : order.id)}
              >
                <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
                  <StatusIcon size={16} className={meta.cls.split(' ')[1]} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">#{order.id}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5">{order.customer} · {order.createdAt}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">₮{Math.round(order.total / 100).toLocaleString()}</p>
                  <p className="text-[10px] text-foreground-muted">{order.items.length} бараа</p>
                </div>
                <ChevronRight size={14} className={`text-foreground-muted transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[var(--glass-border)] pt-3">
                  {/* Items */}
                  <div className="space-y-2 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{item.name} × {item.qty}</span>
                        <span className="font-semibold text-foreground">₮{Math.round(item.price * item.qty / 100).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Delivery info */}
                  <div className="text-xs text-foreground-muted mb-3">
                    <p>📍 {order.address}</p>
                    <p className="mt-1">📞 {order.phone}</p>
                  </div>

                  {/* Actions */}
                  {order.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        disabled={savingId === `${order.id}:ACCEPT`}
                        onClick={() => void handleAction(order.id, 'ACCEPT')}
                        className="flex-1 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
                      >
                        {savingId === `${order.id}:ACCEPT` ? 'Хадгалж байна...' : 'Баталгаажуулах'}
                      </button>
                      <button
                        disabled={savingId === `${order.id}:REJECT`}
                        onClick={() => void handleAction(order.id, 'REJECT')}
                        className="px-4 py-2 rounded-xl bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors disabled:opacity-50"
                      >
                        Цуцлах
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-card border border-[var(--glass-border)] rounded-2xl">
            <p className="text-5xl mb-3">📦</p>
            <p className="text-sm text-foreground-muted">Захиалга олдсонгүй</p>
          </div>
        )}
      </div>
    </div>
  );
}
