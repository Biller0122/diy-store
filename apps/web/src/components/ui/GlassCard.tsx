'use client';

import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  hover?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

export function GlassCard({ hover = true, glow = false, className, children, ...props }: GlassCardProps) {
  return (
    <m.div
      whileHover={hover ? { scale: 1.01 } : undefined}
      whileTap={hover ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'glass rounded-xl',
        hover && 'glass-hover cursor-pointer',
        glow && 'glow-brand',
        className,
      )}
      {...props}
    >
      {children}
    </m.div>
  );
}
