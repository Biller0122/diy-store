'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { useUIStore } from '@/lib/ui-store';
import { useAuthStore } from '@/lib/auth-store';
import { MegaMenu } from './ui/MegaMenu';
import { cn } from '@/lib/utils';
import { getCustomerHomeHref } from '@/lib/portal-links';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { items } = useCartStore();
  const { openSearch, openCart, openAccount } = useUIStore();
  const { customer } = useAuthStore();
  const cartCount = items.reduce((a, i) => a + i.qty, 0);
  const customerHomeHref = getCustomerHomeHref();

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
          : 'bg-surface/80 backdrop-blur-xl md:bg-transparent',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 lg:gap-6">
          {/* Logo */}
          <Link href={customerHomeHref} data-testid="logo" className="flex shrink-0 items-center">
            <BrandLogo />
          </Link>

          <div className="hidden min-w-0 items-center justify-center gap-5 md:flex">
            {/* Desktop nav */}
            <nav className="flex shrink-0 items-center gap-2">
              <MegaMenu />
              {[
                { href: '/trade', label: 'Trade данс' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-white/5 hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Search bar (desktop) */}
            <button
              data-testid="search-trigger"
              onClick={openSearch}
              className="glass glass-hover flex w-full max-w-[360px] items-center gap-2 rounded-full px-4 py-2 text-sm text-foreground-muted transition-all hover:text-foreground lg:max-w-[420px]"
            >
              <Search size={15} />
              <span className="flex-1 text-left">Хайлт хийх...</span>
              <kbd className="rounded border border-[var(--glass-border)] px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* Search icon (mobile) */}
            <button
              data-testid="search-trigger-mobile"
              onClick={openSearch}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <Search size={18} />
            </button>

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

            {/* Account — opens the slide-out drawer */}
            <button
              onClick={openAccount}
              aria-label="Профайл"
              className="group relative hidden sm:flex items-center justify-center"
            >
              {customer ? (
                <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-amber p-[2px] shadow-lg shadow-brand/25 transition-transform group-hover:scale-105">
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-surface text-xs font-extrabold text-foreground">
                    {customer.firstName?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" />
                </span>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-card text-foreground-muted shadow-sm transition-all group-hover:border-brand/50 group-hover:text-brand group-hover:shadow-brand/20">
                  <User size={17} />
                </span>
              )}
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
            <div className="px-2 pb-3">
              <ThemeToggle />
            </div>
            {[
              { href: '/category', label: '📦 Ангилал' },
              { href: '/trade', label: '🏢 Trade данс' },
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
            <button
              onClick={() => { setMobileOpen(false); openAccount(); }}
              className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
            >
              👤 Миний данс
            </button>
          </div>
        </m.div>
      )}
    </header>
  );
}
