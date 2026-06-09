'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Star,
  TrendingUp, Layers, Store, Newspaper, Truck,
  Settings, Bell, LogOut, Menu, X, ChevronRight, MessagesSquare,
  Navigation, Percent,
} from 'lucide-react';
import { useAdminStore } from '@/lib/admin-store';
import { Providers } from '@/components/providers';
import { getCustomerHomeHref } from '@/lib/portal-links';
import { BrandLogo } from '@/components/BrandLogo';

const NAV = [
  { href: '/admin',             icon: LayoutDashboard, label: 'Хяналтын самбар' },
  { href: '/admin/products',    icon: Package,         label: 'Бараа' },
  { href: '/admin/categories',  icon: Layers,          label: 'Ангилал' },
  { href: '/admin/orders',      icon: ShoppingCart,    label: 'Захиалга' },
  { href: '/admin/suppliers',   icon: Store,           label: 'Нийлүүлэгчид' },
  { href: '/admin/drivers',     icon: Truck,           label: 'Жолоочид' },
  { href: '/admin/deliveries',  icon: Navigation,      label: 'Шууд хүргэлт' },
  { href: '/admin/commission',  icon: Percent,         label: 'Комисс' },
  { href: '/admin/customers',   icon: Users,           label: 'Хэрэглэгч' },
  { href: '/admin/reviews',     icon: Star,            label: 'Сэтгэгдэл' },
  { href: '/admin/quotes',      icon: MessagesSquare,  label: 'Trade санал' },
  { href: '/admin/stores',      icon: Store,           label: 'Салбар' },
  { href: '/admin/cms',         icon: Newspaper,       label: 'Контент' },
  { href: '/admin/analytics',   icon: TrendingUp,      label: 'Аналитик' },
  { href: '/admin/settings',    icon: Settings,        label: 'Тохиргоо' },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { admin, logout } = useAdminStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--glass-border)]">
        <Link href={getCustomerHomeHref()} onClick={onClose} className="flex min-w-0 items-center gap-3">
          <BrandLogo variant="sidebar" portalLabel="Admin Panel" />
        </Link>
        <button onClick={onClose} className="ml-auto lg:hidden text-foreground-muted hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
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

      {/* User info */}
      <div className="px-3 py-4 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand">
              {admin?.firstName?.[0] ?? 'A'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {admin?.firstName} {admin?.lastName}
            </p>
            <p className="text-[10px] text-foreground-muted truncate">{admin?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-foreground-muted hover:bg-error/10 hover:text-error transition-colors"
        >
          <LogOut size={14} />
          Гарах
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-card/80 backdrop-blur-xl border-r border-[var(--glass-border)] h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <m.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
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

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { admin } = useAdminStore();
  const router = useRouter();
  const isAdmin = admin?.role?.toLowerCase().includes('admin') ?? false;

  useEffect(() => {
    if (!admin || !isAdmin) {
      router.replace('/admin/login');
    }
  }, [admin, isAdmin, router]);

  if (!admin || !isAdmin) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { admin } = useAdminStore();

  const pageTitle = NAV.find(n =>
    n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)
  )?.label ?? 'Admin';

  if (pathname === '/admin/login') {
    return (
      <Providers>
        <div className="min-h-screen bg-dark">{children}</div>
      </Providers>
    );
  }

  return (
    <Providers>
      <AdminGuard>
        <div className="flex min-h-screen bg-dark">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 flex flex-col min-w-0">
            {/* Top bar */}
            <header className="h-14 border-b border-[var(--glass-border)] bg-card/50 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-foreground-muted"
              >
                <Menu size={18} />
              </button>

              <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>

              <div className="ml-auto flex items-center gap-2">
                <button className="relative p-2 rounded-xl hover:bg-white/5 text-foreground-muted transition-colors">
                  <Bell size={16} />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand" />
                </button>
                <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-brand">
                    {admin?.firstName?.[0] ?? 'A'}
                  </span>
                </div>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </AdminGuard>
    </Providers>
  );
}
