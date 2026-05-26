'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Grid3x3, ShoppingCart, User, type LucideIcon } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { useUIStore } from '@/lib/ui-store';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  action?: 'search' | 'cart';
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',          label: 'Нүүр',    icon: Home },
  { href: '/search',    label: 'Хайлт',   icon: Search,    action: 'search' },
  { href: '/category',  label: 'Ангилал', icon: Grid3x3 },
  { href: '/cart',      label: 'Сагс',    icon: ShoppingCart, action: 'cart' },
  { href: '/account',   label: 'Данс',    icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { items } = useCartStore();
  const { openSearch, openCart } = useUIStore();
  const cartCount = items.reduce((a, i) => a + i.qty, 0);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      <div className="glass-strong border-t border-[var(--glass-border)] px-1 py-2">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map(({ href, label, icon: Icon, action }) => {
            const active = isActive(href) && action !== 'search';
            const isCart = action === 'cart';
            const isSearch = action === 'search';

            const handleClick = (e: React.MouseEvent) => {
              if (isSearch) { e.preventDefault(); openSearch(); }
              if (isCart) { e.preventDefault(); openCart(); }
            };

            return (
              <Link
                key={href}
                href={isSearch || isCart ? '#' : href}
                onClick={handleClick}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors min-w-[56px]',
                  active ? 'text-brand' : 'text-foreground-muted',
                )}
              >
                {/* Active indicator */}
                {active && (
                  <m.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand"
                    transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                  />
                )}

                <div className="relative">
                  <m.div whileTap={{ scale: 0.85 }} transition={{ duration: 0.1 }}>
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.5 : 1.8}
                      className={active ? 'text-brand' : 'text-foreground-muted'}
                    />
                  </m.div>

                  {/* Cart badge */}
                  {isCart && cartCount > 0 && (
                    <m.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center"
                    >
                      {cartCount > 9 ? '9+' : cartCount}
                    </m.span>
                  )}
                </div>

                <span className={cn(
                  'text-[9px] font-medium',
                  active ? 'text-brand' : 'text-foreground-muted',
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
