'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { useAdminStore } from '@/lib/admin-store';
import { BrandLogo } from '@/components/BrandLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAdminStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(username, password);
    if (ok) router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <BrandLogo variant="mark" imageClassName="mx-auto mb-4 h-14 w-14 rounded-2xl" />
          <BrandLogo imageClassName="mx-auto w-56" />
          <p className="text-sm text-foreground-muted mt-1">Удирдлагын самбар</p>
        </div>

        <div className="bg-card border border-[var(--glass-border)] rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                Нэвтрэх нэр
              </label>
              <input
                data-testid="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="superadmin"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--glass-border)] bg-surface text-foreground placeholder:text-foreground-muted/50 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                Нууц үг
              </label>
              <input
                data-testid="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--glass-border)] bg-surface text-foreground placeholder:text-foreground-muted/50 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>

            {error && (
              <p className="text-sm text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              data-testid="admin-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Нэвтэрч байна...
                </>
              ) : 'Нэвтрэх'}
            </button>
          </form>

          {process.env.NODE_ENV === 'development' && (
            <p className="mt-4 text-center text-[10px] text-foreground-muted/50 font-mono">
              dev: superadmin / superadmin
            </p>
          )}
        </div>
      </m.div>
    </div>
  );
}
