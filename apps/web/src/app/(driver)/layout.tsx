'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Navigation, History,
  DollarSign, LogOut, Menu, X, ChevronRight, Bell,
} from 'lucide-react';
import { useDriverStore } from '@/lib/driver-store';
import { Providers } from '@/components/providers';
import { getCustomerHomeHref } from '@/lib/portal-links';

const NAV = [
  { href: '/driver/dashboard',       icon: LayoutDashboard, label: 'Хяналтын самбар' },
  { href: '/driver/active-delivery', icon: Navigation,      label: 'Идэвхтэй хүргэлт' },
  { href: '/driver/earnings',        icon: DollarSign,      label: 'Орлого' },
  { href: '/driver/history',         icon: History,         label: 'Түүх' },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { driver, logout, setStatus, isOnline } = useDriverStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    void fetch('/api/driver/session', { method: 'DELETE' });
    router.push('/driver/login');
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--glass-border)]">
        <Link href={getCustomerHomeHref()} onClick={onClose} className="flex min-w-0 items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30 shrink-0">
          <span className="text-lg">🏍️</span>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-tight">DIY<span className="text-brand">Store</span></p>
          <p className="text-[10px] text-foreground-muted">Жолооч портал</p>
        </div>
        </Link>
        <button onClick={onClose} className="ml-auto lg:hidden text-foreground-muted hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      {/* Online toggle */}
      {driver && (
        <div className="mx-3 mt-3">
          <button
            onClick={() => setStatus(isOnline ? 'OFFLINE' : 'ONLINE')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition-all ${isOnline ? 'bg-success/15 border border-success/30 text-success' : 'bg-surface border border-[var(--glass-border)] text-foreground-muted'}`}
          >
            <span>{isOnline ? '🟢 Онлайн' : '⚫ Офлайн'}</span>
            <div className={`w-10 h-5 rounded-full transition-all relative ${isOnline ? 'bg-success' : 'bg-foreground-muted/30'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isOnline ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm transition-all ${
                active ? 'bg-brand/15 text-brand font-semibold' : 'text-foreground-muted hover:bg-white/5 hover:text-foreground'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
              {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Driver info */}
      <div className="px-3 py-4 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand">{driver?.firstName?.[0] ?? 'D'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{driver?.firstName} {driver?.lastName}</p>
            <p className="text-[10px] text-foreground-muted truncate">★ {driver?.rating} · {driver?.totalDeliveries} хүргэлт</p>
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

function DriverGuard({ children }: { children: React.ReactNode }) {
  const { driver, hasHydrated } = useDriverStore();
  const router = useRouter();
  const pathname = usePathname();
  const publicRoute = pathname === '/driver/login' || pathname === '/driver/register' || pathname === '/driver/pending';

  useEffect(() => {
    if (hasHydrated && !driver && !publicRoute) {
      router.replace('/driver/login');
    }
  }, [driver, hasHydrated, publicRoute, router]);

  if ((!hasHydrated || !driver) && !publicRoute) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { isOnline } = useDriverStore();

  const pageTitle = NAV.find((n) =>
    pathname === n.href || pathname.startsWith(`${n.href}/`)
  )?.label ?? 'Жолооч';

  if (pathname === '/driver/login' || pathname === '/driver/register' || pathname === '/driver/pending') {
    return (
      <Providers>
        <div className="min-h-screen bg-dark">{children}</div>
      </Providers>
    );
  }

  return (
    <Providers>
      <DriverGuard>
        <div className="flex min-h-screen bg-dark">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 border-b border-[var(--glass-border)] bg-card/50 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-foreground-muted">
                <Menu size={18} />
              </button>
              <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isOnline ? 'bg-success/15 text-success' : 'bg-foreground-muted/15 text-foreground-muted'}`}>
                  {isOnline ? '🟢 Онлайн' : '⚫ Офлайн'}
                </span>
                <button className="relative p-2 rounded-xl hover:bg-white/5 text-foreground-muted">
                  <Bell size={16} />
                </button>
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </DriverGuard>
    </Providers>
  );
}
