'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Bright', icon: Sun },
] as const;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeTheme = mounted ? theme ?? 'dark' : 'dark';

  return (
    <div className={cn(
      'inline-flex items-center rounded-full border border-[var(--glass-border)] bg-card/80 p-1 shadow-sm',
      compact ? 'gap-0.5' : 'gap-1',
    )}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = activeTheme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full text-xs font-bold transition-all',
              compact ? 'px-2.5 py-1.5' : 'px-3 py-2',
              active ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-foreground-muted hover:bg-surface hover:text-foreground',
            )}
            aria-pressed={active}
          >
            <Icon size={compact ? 13 : 14} />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
