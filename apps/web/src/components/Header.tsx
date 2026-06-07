'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { Search, ShoppingCart, User, Hammer, Menu, X, Truck } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { useUIStore } from '@/lib/ui-store';
import { useAuthStore } from '@/lib/auth-store';
import { MegaMenu } from './ui/MegaMenu';
import { cn } from '@/lib/utils';
import { getCustomerHomeHref, getPortalHref } from '@/lib/portal-links';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { items } = useCartStore();
  const { openSearch, openCart } = useUIStore();
  const { customer } = useAuthStore();
  const cartCount = items.reduce((a, i) => a + i.qty, 0);
  const customerHomeHref = getCustomerHomeHref();
  const driverLoginHref = getPortalHref('driver', '/driver/login');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled
          ? 'glass border-b border-[var(--glass-border)] shadow-lg shadow-black/20'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href={customerHomeHref} data-testid="logo" className="flex items-center gap-2 shrink-0 group">
            <m.div
              whileHover={{ rotate: [0, -12, 12, 0] }}
              transition={{ duration: 0.4 }}
              className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30"
            >
              <Hammer size={16} className="text-white" />
            </m.div>
            <div className="hidden sm:block">
              <span className="font-display font-black text-lg text-foreground tracking-tight">
                DIY<span className="text-brand">Store</span>
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            <MegaMenu />
            {[
              { href: '/how-to', label: 'DIY Зөвлөгөө' },
              { href: '/trade', label: 'Trade данс' },
              ...(!customer ? [{ href: driverLoginHref, label: 'Жолооч' }] : []),
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 rounded-xl text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Search bar (desktop) */}
          <button
            data-testid="search-trigger"
            onClick={openSearch}
            className="hidden md:flex flex-1 max-w-xs items-center gap-2 glass glass-hover rounded-full px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-all"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Хайлт хийх...</span>
            <kbd className="text-[10px] border border-[var(--glass-border)] rounded px-1.5 py-0.5 font-mono">
              ⌘K
            </kbd>
          </button>

          <div className="flex-1 md:flex-none" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Search icon (mobile) */}
            <button
              data-testid="search-trigger-mobile"
              onClick={openSearch}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <Search size={18} />
            </button>

            {/* Driver — hidden for logged-in customers */}
            {!customer && (
              <Link
                href={driverLoginHref}
                className="hidden lg:flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
              >
                <Truck size={16} />
                <span>Жолооч</span>
              </Link>
            )}

            {/* Account */}
            <Link
              href={customer ? '/account' : '/account/login'}
              className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors"
            >
              {customer ? (
                <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">
                  {customer.firstName?.[0] ?? 'U'}
                </div>
              ) : (
                <User size={18} />
              )}
            </Link>

            {/* Cart */}
            <button
              data-testid="cart-icon"
              onClick={openCart}
              className="relative flex items-center gap-2 glass glass-hover rounded-xl px-3 py-2 transition-all"
            >
              <ShoppingCart size={16} className="text-foreground" />
              {cartCount > 0 && (
                <m.span
                  data-testid="cart-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center"
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </m.span>
              )}
              <span className="hidden sm:block text-sm font-medium text-foreground">
                Сагс
              </span>
            </button>

            {/* Mobile menu */}
            <button
              data-testid="mobile-menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-[var(--glass-border)] bg-surface/95 backdrop-blur-xl"
        >
          <div className="px-4 py-4 space-y-1">
            {[
              { href: '/category', label: '📦 Ангилал' },
              { href: '/how-to', label: '🔨 DIY Зөвлөгөө' },
              { href: '/trade', label: '🏢 Trade данс' },
              { href: '/account', label: '👤 Миний данс' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </m.div>
      )}
    </header>
  );
}
