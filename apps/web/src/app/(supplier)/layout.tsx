'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingCart, DollarSign,
  Star, Settings, LogOut, Menu, X, ChevronRight, Bell,
} from 'lucide-react';
import { useSupplierStore } from '@/lib/supplier-store';
import { Providers } from '@/components/providers';
import { getCustomerHomeHref } from '@/lib/portal-links';
import { BrandLogo } from '@/components/BrandLogo';

const NAV = [
  { href: '/supplier',          icon: LayoutDashboard, label: 'Хяналтын самбар' },
  { href: '/supplier/products', icon: Package,         label: 'Миний бараа' },
  { href: '/supplier/orders',   icon: ShoppingCart,    label: 'Захиалгууд' },
  { href: '/supplier/revenue',  icon: DollarSign,      label: 'Орлого' },
  { href: '/supplier/reviews',  icon: Star,            label: 'Сэтгэгдэл' },
  { href: '/supplier/settings', icon: Settings,        label: 'Тохиргоо' },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { supplier, logout } = useSupplierStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/supplier/login');
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--glass-border)]">
        <Link href={getCustomerHomeHref()} onClick={onClose} className="flex min-w-0 items-center gap-3">
          <BrandLogo variant="sidebar" portalLabel="Нийлүүлэгч" />
        </Link>
        <button onClick={onClose} className="ml-auto lg:hidden text-foreground-muted hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      {/* Supplier info chip */}
      {supplier && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-brand/10 border border-brand/20">
          <p className="text-xs font-semibold text-foreground truncate">{supplier.businessName}</p>
          <p className="text-[10px] text-foreground-muted mt-0.5">{supplier.district}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${supplier.status === 'ACTIVE' ? 'bg-success' : 'bg-amber-400'}`} />
            <span className={`text-[10px] font-medium ${supplier.status === 'ACTIVE' ? 'text-success' : 'text-amber-400'}`}>
              {supplier.status === 'ACTIVE' ? 'Идэвхтэй' : 'Хүлээгдэж байна'}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/supplier' ? pathname === '/supplier' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm transition-all ${
                active
                  ? 'bg-brand/15 text-brand font-semibold'
                  : 'text-foreground-muted hover:bg-white/5 hover:text-foreground'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
              {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand">{supplier?.ownerName?.[0] ?? 'S'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{supplier?.ownerName}</p>
            <p className="text-[10px] text-foreground-muted truncate">{supplier?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-foreground-muted hover:bg-error/10 hover:text-error transition-colors"
        >
          <LogOut size={14} /> Гарах
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-card/80 backdrop-blur-xl border-r border-[var(--glass-border)] h-screen sticky top-0">
        {content}
      </aside>
      <AnimatePresence>
        {open && (
          <>
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-40 lg:hidden" />
            <m.aside
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-card/95 backdrop-blur-xl border-r border-[var(--glass-border)] z-50 lg:hidden"
            >
              {content}
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SupplierGuard({ children }: { children: React.ReactNode }) {
  const { supplier, hasHydrated } = useSupplierStore();
  const router = useRouter();
  const pathname = usePathname();
  const publicRoute = pathname === '/supplier/login' || pathname === '/supplier/register' || pathname === '/supplier/pending';

  useEffect(() => {
    if (hasHydrated && !supplier && !publicRoute) {
      router.replace('/supplier/login');
    }
  }, [supplier, hasHydrated, publicRoute, router]);

  if ((!hasHydrated || !supplier) && !publicRoute) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { supplier } = useSupplierStore();

  const pageTitle = NAV.find((n) =>
    n.href === '/supplier' ? pathname === '/supplier' : pathname.startsWith(n.href)
  )?.label ?? 'Нийлүүлэгч';

  if (pathname === '/supplier/login' || pathname === '/supplier/register' || pathname === '/supplier/pending') {
    return (
      <Providers>
        <div className="min-h-screen bg-dark">{children}</div>
      </Providers>
    );
  }

  return (
    <Providers>
      <SupplierGuard>
        <div className="flex min-h-screen bg-dark">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 border-b border-[var(--glass-border)] bg-card/50 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-foreground-muted">
                <Menu size={18} />
              </button>
              <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
              <div className="ml-auto flex items-center gap-2">
                <button className="relative p-2 rounded-xl hover:bg-white/5 text-foreground-muted">
                  <Bell size={16} />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand" />
                </button>
                <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-brand">{supplier?.ownerName?.[0] ?? 'S'}</span>
                </div>
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </SupplierGuard>
    </Providers>
  );
}
