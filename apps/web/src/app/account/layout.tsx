'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

const NAV = [
  { href: '/account', label: 'Хяналтын самбар', icon: '🏠', exact: true },
  { href: '/account/orders', label: 'Захиалгууд', icon: '📦' },
  { href: '/account/addresses', label: 'Хаягууд', icon: '📍' },
  { href: '/account/wishlist', label: 'Хадгалсан бараа', icon: '❤️' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { customer, logout } = useAuthStore();

  // Login page renders its own full-page layout
  if (pathname === '/account/login') return <>{children}</>;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            {/* Profile card */}
            <div className="bg-card rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-xl font-bold text-brand">
                  {customer?.firstName?.[0] ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {customer ? `${customer.firstName} ${customer.lastName}` : 'Зочин'}
                  </p>
                  <p className="text-xs text-foreground-muted truncate">{customer?.emailAddress ?? ''}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="bg-card rounded-2xl overflow-hidden">
              {NAV.map(({ href, label, icon, exact }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium border-b border-[var(--glass-border)] last:border-0 transition-colors ${
                    isActive(href, exact)
                      ? 'bg-brand/5 text-brand-light border-l-4 border-l-brand'
                      : 'text-foreground hover:bg-dark'
                  }`}
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-error hover:bg-error/10 transition-colors"
              >
                <span>🚪</span>
                Гарах
              </button>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
