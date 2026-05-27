'use client';

import Link from 'next/link';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, Users, Package,
  AlertTriangle, ArrowRight, Wifi, WifiOff,
} from 'lucide-react';
import {
  getTopProducts, getLowStockProducts,
} from '@/lib/admin-data';
import { useAdminMetrics, useAdminOrders } from '@/lib/use-admin-data';

const STATE_LABEL: Record<string, { label: string; cls: string }> = {
  PaymentAuthorized: { label: 'Баталгаажсан',   cls: 'bg-blue-500/15 text-blue-400' },
  PaymentSettled:    { label: 'Төлбөр хийгдсэн', cls: 'bg-green-500/15 text-green-400' },
  Shipped:           { label: 'Илгээсэн',         cls: 'bg-purple-500/15 text-purple-400' },
  Delivered:         { label: 'Хүргэсэн',         cls: 'bg-emerald-500/15 text-emerald-400' },
  Cancelled:         { label: 'Цуцалсан',         cls: 'bg-red-500/15 text-red-400' },
};

function MetricCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-xs text-foreground-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-foreground-muted mt-0.5">{sub}</p>}
    </div>
  );
}

type TooltipPayload = { value: number };

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean; payload?: TooltipPayload[]; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-foreground-muted mb-1">{label}</p>
      <p className="font-bold text-foreground">₮{payload[0].value.toLocaleString('mn-MN')}</p>
      {payload[1] && <p className="text-foreground-muted">{payload[1].value} захиалга</p>}
    </div>
  );
};

export default function AdminDashboard() {
  const { metrics, revenueData, isLive: metricsLive } = useAdminMetrics();
  const { orders: recentOrders, isLive: ordersLive } = useAdminOrders(1, 8);
  const topProducts = getTopProducts();
  const lowStock = getLowStockProducts();

  const isLive = metricsLive || ordersLive;

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl w-fit ${
        isLive ? 'bg-success/10 text-success' : 'bg-foreground-muted/10 text-foreground-muted'
      }`}>
        {isLive ? <Wifi size={12} /> : <WifiOff size={12} />}
        {isLive ? 'Шууд өгөгдөл' : 'Туршилтын өгөгдөл'}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={TrendingUp}
          label="Өнөөдрийн борлуулалт"
          value={`₮${(metrics.todayRevenue / 100000).toFixed(0)}K`}
          sub="Нийт орлого"
          color="bg-brand/15 text-brand"
        />
        <MetricCard
          icon={ShoppingCart}
          label="Нийт захиалга"
          value={String(metrics.totalOrders)}
          sub={`${metrics.pendingOrders} хүлээгдэж байна`}
          color="bg-blue-500/15 text-blue-400"
        />
        <MetricCard
          icon={Users}
          label="Нийт хэрэглэгч"
          value={String(metrics.newCustomers)}
          sub="Бүртгэлтэй"
          color="bg-purple-500/15 text-purple-400"
        />
        <MetricCard
          icon={Package}
          label="Хүлээгдэж буй захиалга"
          value={String(metrics.pendingOrders)}
          sub={`${lowStock.length} бараа нөөц дутмаг`}
          color="bg-amber-500/15 text-amber-400"
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">30 хоногийн орлого</h2>
          <span className="text-xs text-foreground-muted">MNT</span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4500" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#FF4500" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#FF4500" strokeWidth={2} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Сүүлийн захиалгууд</h2>
            <Link href="/admin/orders" className="text-xs text-brand hover:underline flex items-center gap-1">
              Бүгдийг харах <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map((order) => {
              const st = STATE_LABEL[order.state] ?? { label: order.state, cls: 'bg-white/10 text-foreground-muted' };
              return (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                    <ShoppingCart size={12} className="text-foreground-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate font-mono">
                      {order.code}
                    </p>
                    <p className="text-[10px] text-foreground-muted truncate">
                      {order.customer?.firstName} {order.customer?.lastName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">
                      ₮{Math.round(order.totalWithTax / 100).toLocaleString('mn-MN')}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {/* Top products */}
          <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Шилдэг бүтээгдэхүүн</h2>
              <Link href="/admin/products" className="text-xs text-brand hover:underline flex items-center gap-1">
                Бүгдийг харах <ArrowRight size={11} />
              </Link>
            </div>
            <div className="space-y-2">
              {topProducts.map((p) => (
                <div key={p.rank} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-foreground-muted w-4 text-center shrink-0">{p.rank}</span>
                  <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                    <Package size={12} className="text-foreground-muted" />
                  </div>
                  <p className="text-xs text-foreground truncate flex-1">{p.name}</p>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">{p.sold} ш</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low stock alerts */}
          <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Нөөц дутмаг</h2>
            </div>
            <div className="space-y-2">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${p.stock === 0 ? 'bg-error' : 'bg-amber-400'}`} />
                  <p className="text-xs text-foreground truncate flex-1">{p.name}</p>
                  <span className={`text-xs font-bold ${p.stock === 0 ? 'text-error' : 'text-amber-400'}`}>
                    {p.stock === 0 ? 'Дууссан' : `${p.stock} ш`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
