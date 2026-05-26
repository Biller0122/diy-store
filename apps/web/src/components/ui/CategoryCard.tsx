'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  name: string;
  slug: string;
  icon: string;
  productCount?: number;
  index?: number;
}

const GLOW_COLORS = [
  'rgba(255,69,0,0.2)',
  'rgba(245,158,11,0.2)',
  'rgba(59,130,246,0.2)',
  'rgba(16,185,129,0.2)',
  'rgba(139,92,246,0.2)',
  'rgba(236,72,153,0.2)',
];

export function CategoryCard({ name, slug, icon, productCount, index = 0 }: CategoryCardProps) {
  const glowColor = GLOW_COLORS[index % GLOW_COLORS.length];

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'backOut' }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      <Link href={`/category/${slug}`} className="block">
        <div className={cn(
          'group relative rounded-2xl p-5 flex flex-col items-center gap-3 text-center',
          'bg-card border border-[var(--glass-border)]',
          'hover:border-[var(--glass-border-hover)] transition-all duration-300',
          'overflow-hidden cursor-pointer',
        )}>
          {/* Glow background on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
            style={{ background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)` }}
          />

          {/* Gradient border animation */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 gradient-border pointer-events-none" />

          {/* Icon */}
          <m.div
            whileHover={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
            style={{
              background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
              boxShadow: `0 0 20px ${glowColor}`,
            }}
          >
            {icon}
          </m.div>

          {/* Name */}
          <div className="relative z-10">
            <p className="font-semibold text-sm text-foreground group-hover:text-white transition-colors leading-snug">
              {name}
            </p>
            {productCount !== undefined && (
              <p className="text-xs text-foreground-muted mt-0.5">
                {productCount} бараа
              </p>
            )}
          </div>

          {/* Bottom accent line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
          />
        </div>
      </Link>
    </m.div>
  );
}
