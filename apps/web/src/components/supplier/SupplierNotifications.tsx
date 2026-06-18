'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useSupplierStore } from '@/lib/supplier-store';
import {
  useSupplierOrdersData,
  useSupplierProductsData,
  buildNotifications,
  useNotifSeen,
} from '@/lib/supplier-dashboard';

export function SupplierNotifications() {
  const supplierId = useSupplierStore((s) => s.supplier?.id);
  const { data: orders = [] } = useSupplierOrdersData();
  const { data: products = [] } = useSupplierProductsData();
  const { seen, markSeen } = useNotifSeen();
  const [open, setOpen] = useState(false);

  const notifications = buildNotifications(orders, products, supplierId);
  const unread = notifications.filter((n) => !seen.includes(n.id)).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && notifications.length > 0) markSeen(notifications.map((n) => n.id));
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Мэдэгдэл"
        className="relative p-2 rounded-xl hover:bg-white/5 text-foreground-muted"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 max-h-[420px] w-80 overflow-y-auto rounded-2xl border border-[var(--glass-border)] bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3">
              <span className="text-sm font-bold text-foreground">Мэдэгдэл</span>
              <span className="text-xs text-foreground-muted">{notifications.length}</span>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell size={28} className="mx-auto mb-2 text-foreground-muted/50" />
                <p className="text-sm text-foreground-muted">Мэдэгдэл алга байна</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 border-b border-[var(--glass-border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-white/5"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      n.kind === 'order' ? 'bg-brand/15 text-brand' : 'bg-amber/15 text-amber'
                    }`}
                  >
                    {n.kind === 'order' ? <ShoppingCart size={14} /> : <AlertTriangle size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-foreground-muted">{n.body}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
