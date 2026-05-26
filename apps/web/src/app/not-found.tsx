import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl bg-card border border-[var(--glass-border)] flex items-center justify-center mx-auto mb-6 text-4xl">
          🔍
        </div>

        {/* 404 */}
        <h1 className="text-8xl font-black text-brand mb-2">404</h1>
        <h2 className="text-xl font-bold text-foreground mb-2">Хуудас олдсонгүй</h2>
        <p className="text-sm text-foreground-muted mb-8">
          Таны хайж буй хуудас байхгүй байна. Буцаж эхний хуудас руу очно уу.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
          >
            Нүүр хуудас руу буцах
          </Link>
          <Link
            href="/category"
            className="px-6 py-3 rounded-xl border border-[var(--glass-border)] text-foreground-muted text-sm font-semibold hover:text-foreground hover:border-brand/30 transition-colors"
          >
            Ангилал харах
          </Link>
        </div>
      </div>
    </div>
  );
}
