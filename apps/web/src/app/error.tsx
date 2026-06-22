'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Error boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full">
        <div className="w-24 h-24 rounded-3xl bg-error/10 border border-error/20 flex items-center justify-center mx-auto mb-6 text-4xl">
          ⚠️
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">Алдаа гарлаа</h1>
        <p className="text-sm text-foreground-muted mb-2">
          Уучлаарай, ямар нэгэн алдаа гарлаа. Дахин оролдоно уу.
        </p>
        {error.digest && (
          <p className="text-xs text-foreground-muted/50 mb-6 font-mono">
            ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
          >
            Дахин оролдох
          </button>
          <a
            href="/"
            className="px-6 py-3 rounded-xl border border-[var(--glass-border)] text-foreground-muted text-sm font-semibold hover:text-foreground transition-colors"
          >
            Нүүр хуудас руу буцах
          </a>
        </div>
        <p className="mt-6 text-xs text-foreground-muted">
          Асуудал үргэлжлэх тохиолдолд{' '}
          <a href="mailto:support@shoptool.mn" className="text-brand hover:underline">
            support@shoptool.mn
          </a>
          {' '}холбогдоно уу.
        </p>
      </div>
    </div>
  );
}
