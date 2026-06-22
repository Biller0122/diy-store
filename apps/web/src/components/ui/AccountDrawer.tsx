'use client';

import { m, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X, Package, User, Heart, MapPin, Ticket, Settings,
  ChevronRight, HelpCircle, LogOut, Store,
} from 'lucide-react';
import { useUIStore } from '@/lib/ui-store';
import { useAuthStore } from '@/lib/auth-store';

const MENU: { icon: React.ElementType; label: string; href: string }[] = [
  { icon: Package, label: 'Захиалгууд', href: '/account/orders' },
  { icon: User, label: 'Хувийн мэдээлэл', href: '/account' },
  { icon: Heart, label: 'Хүслийн жагсаалт', href: '/account' },
  { icon: MapPin, label: 'Хаягууд', href: '/account' },
  { icon: Ticket, label: 'Купон, ваучер', href: '/account' },
  { icon: Settings, label: 'Тохиргоо', href: '/account' },
];

export function AccountDrawer() {
  const { accountOpen, closeAccount } = useUIStore();
  const { customer, logout } = useAuthStore();
  const router = useRouter();

  const fullName = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Хэрэглэгч' : '';
  const initial = (customer?.firstName?.[0] ?? customer?.emailAddress?.[0] ?? 'U').toUpperCase();

  async function handleLogout() {
    await logout();
    closeAccount();
    router.push('/');
  }

  return (
    <AnimatePresence>
      {accountOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAccount}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <m.div
            data-testid="account-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[90] flex w-full max-w-md flex-col bg-surface border-l border-[var(--glass-border)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{fullName || 'Зочин'}</p>
                  <p className="truncate text-xs text-foreground-muted">{customer?.emailAddress ?? customer?.phoneNumber ?? ''}</p>
                </div>
              </div>
              <button onClick={closeAccount} className="text-foreground-muted transition-colors hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {!customer ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10 text-4xl">👤</div>
                  <div>
                    <p className="font-semibold text-foreground">Нэвтрээгүй байна</p>
                    <p className="mt-1 text-sm text-foreground-muted">Захиалга өгөхийн тулд нэвтэрнэ үү</p>
                  </div>
                  <Link
                    href="/account/login"
                    onClick={closeAccount}
                    className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-hover"
                  >
                    Нэвтрэх
                  </Link>
                </div>
              ) : (
                <>
                  {/* Account card */}
                  <Link
                    href="/trade"
                    onClick={closeAccount}
                    className="block rounded-2xl bg-gradient-to-br from-brand to-amber p-4 text-white shadow-lg shadow-brand/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold opacity-90">Trade данс</span>
                      <ChevronRight size={16} />
                    </div>
                    <p className="mt-2 text-lg font-black">Бизнесийн худалдан авалт</p>
                    <p className="text-xs opacity-90">Нэхэмжлэх, тооцоо нэгтгэх</p>
                  </Link>

                  {/* Menu grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {MENU.map(({ icon: Icon, label, href }) => (
                      <Link
                        key={label}
                        href={href}
                        onClick={closeAccount}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--glass-border)] bg-card p-4 text-center transition-colors hover:border-brand/40 hover:bg-white/5"
                      >
                        <Icon size={22} className="text-brand" />
                        <span className="text-[11px] font-semibold leading-tight text-foreground">{label}</span>
                      </Link>
                    ))}
                  </div>

                  {/* Become a supplier */}
                  <Link
                    href="/trade"
                    onClick={closeAccount}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-card p-4 transition-colors hover:border-brand/40"
                  >
                    <Store size={20} className="text-brand" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Нийлүүлэгч болох</p>
                      <p className="text-xs text-foreground-muted">Бараагаа онлайн зараарай</p>
                    </div>
                    <ChevronRight size={16} className="text-foreground-muted" />
                  </Link>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="space-y-2 border-t border-[var(--glass-border)] px-5 py-4">
              <Link
                href="/how-to"
                onClick={closeAccount}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] py-2.5 text-sm font-semibold text-foreground-muted transition-colors hover:text-foreground"
              >
                <HelpCircle size={16} /> Тусламж
              </Link>
              {customer && (
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-error/10 py-2.5 text-sm font-bold text-error transition-colors hover:bg-error/20"
                >
                  <LogOut size={16} /> Системээс гарах
                </button>
              )}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
