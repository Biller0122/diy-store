'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useOrderStore } from '@/lib/order-store';
import { useWishlistStore } from '@/lib/wishlist-store';

const QUICK_LINKS = [
  { href: '/account/orders', label: 'Захиалгууд', icon: '📦', desc: 'Захиалгын түүх харах' },
  { href: '/account/addresses', label: 'Хаягууд', icon: '📍', desc: 'Хүргэлтийн хаяг удирдах' },
  { href: '/account/wishlist', label: 'Хадгалсан бараа', icon: '❤️', desc: 'Таалагдсан бүтээгдэхүүн' },
];

export default function AccountDashboard() {
  const { customer, fetchActiveCustomer } = useAuthStore();
  const { orders } = useOrderStore();
  const { items: wishlistItems } = useWishlistStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    fetchActiveCustomer();
  }, [fetchActiveCustomer]);

  const recentOrders = orders.slice(0, 3);

  const STATUS_COLOR: Record<string, string> = {
    'Хүлээгдэж буй': 'bg-amber/10 text-amber',
    'Боловсруулж буй': 'bg-info/10 text-info',
    'Хүргэлтэнд': 'bg-purple-500/10 text-purple-400',
    'Хүргэгдсэн': 'bg-success/10 text-success',
    'Цуцлагдсан': 'bg-error/10 text-error',
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-400 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">
          Сайн байна уу, {customer?.firstName ?? 'Зочин'}!
        </h1>
        <p className="text-amber-100 text-sm">Таны дансанд тавтай морилно уу</p>
      </div>

      {/* Stats */}
      {hydrated && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-brand">{orders.length}</p>
            <p className="text-xs text-foreground-muted mt-1">Нийт захиалга</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-brand">
              {orders.filter((o) => o.status === 'Хүлээгдэж буй').length}
            </p>
            <p className="text-xs text-foreground-muted mt-1">Хүлээгдэж буй</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-3xl font-bold text-brand">{wishlistItems.length}</p>
            <p className="text-xs text-foreground-muted mt-1">Хадгалсан бараа</p>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {QUICK_LINKS.map(({ href, label, icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-card rounded-xl p-5 hover:shadow-xl hover:shadow-black/30 transition-shadow flex flex-col gap-2 group"
          >
            <span className="text-3xl">{icon}</span>
            <span className="font-semibold text-foreground group-hover:text-brand transition-colors">
              {label}
            </span>
            <span className="text-xs text-foreground-muted">{desc}</span>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      {hydrated && recentOrders.length > 0 && (
        <div className="bg-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Сүүлийн захиалгууд</h2>
            <Link href="/account/orders" className="text-sm text-brand hover:underline">
              Бүгдийг харах →
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.code}
                href={`/account/orders/${order.code}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-dark transition-colors"
              >
                <div>
                  <p className="font-medium text-sm text-foreground">#{order.code}</p>
                  <p className="text-xs text-foreground-muted">
                    {new Date(order.placedAt).toLocaleDateString('mn-MN')} ·{' '}
                    {order.items.length} бараа
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? 'bg-surface text-foreground-muted'}`}
                  >
                    {order.status}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    ₮{Math.round(order.total / 100).toLocaleString('mn-MN')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Account info */}
      {customer && (
        <div className="bg-card rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Дансны мэдээлэл</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Нэр</dt>
              <dd className="font-medium text-foreground">
                {customer.firstName} {customer.lastName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground-muted">И-мэйл</dt>
              <dd className="font-medium text-foreground">{customer.emailAddress}</dd>
            </div>
            {customer.phoneNumber && (
              <div className="flex justify-between">
                <dt className="text-foreground-muted">Утас</dt>
                <dd className="font-medium text-foreground">{customer.phoneNumber}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
