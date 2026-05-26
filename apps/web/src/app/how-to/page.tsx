'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { m } from 'framer-motion';
import { ARTICLES, CATEGORIES } from './articles';

// ─── Article Card ─────────────────────────────────────────────

function ArticleCard({ article, index }: { article: typeof ARTICLES[0]; index: number }) {
  const date = new Date(article.date).toLocaleDateString('mn-MN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <m.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group bg-card border border-[var(--glass-border)] rounded-2xl overflow-hidden hover:border-[var(--glass-border-hover)] transition-colors"
    >
      {/* Cover */}
      <Link href={`/how-to/${article.slug}`}>
        <div className={`relative h-44 bg-gradient-to-br ${article.gradient} flex items-center justify-center overflow-hidden`}>
          <m.span
            className="text-6xl"
            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
          >
            {article.emoji}
          </m.span>
          {/* Category badge */}
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs font-medium text-white border border-white/10">
            {article.category}
          </span>
          {/* Read time */}
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs text-white/80">
            ⏱ {article.readTime} мин
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/how-to/${article.slug}`}>
          <h3 className="font-bold text-foreground text-sm leading-snug mb-2 line-clamp-2 group-hover:text-brand transition-colors">
            {article.title}
          </h3>
        </Link>
        <p className="text-xs text-foreground-muted leading-relaxed line-clamp-3 mb-4">
          {article.description}
        </p>

        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <span>✍️ {article.author}</span>
          <span>{date}</span>
        </div>
      </div>
    </m.article>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function HowToPage() {
  const [category, setCategory] = useState('Бүгд');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return ARTICLES.filter((a) => {
      const matchCat = category === 'Бүгд' || a.category === category;
      const q = search.toLowerCase();
      const matchSearch = !q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [category, search]);

  return (
    <div className="min-h-screen bg-dark">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-[var(--glass-border)]">
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center">
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-3"
          >
            🔨 DIY <span className="gradient-text">Зөвлөгөө</span>
          </m.h1>
          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-foreground-muted mb-8 max-w-md mx-auto"
          >
            Гэрийн засвар, тохижуулалтын практик зааварчилгаа, зөвлөмж
          </m.p>

          {/* Search */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative max-w-lg mx-auto"
          >
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Нийтлэл хайх..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[var(--glass-border)] bg-card/80 backdrop-blur-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-brand text-sm"
            />
          </m.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-brand text-white'
                  : 'bg-card border border-[var(--glass-border)] text-foreground-muted hover:border-brand/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-foreground-muted mb-6">
          {filtered.length} нийтлэл{search && ` — "${search}" хайлтын үр дүн`}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-foreground-muted">
            <span className="text-5xl mb-3">🔍</span>
            <p className="font-medium">Нийтлэл олдсонгүй</p>
            <button
              onClick={() => { setSearch(''); setCategory('Бүгд'); }}
              className="mt-4 text-sm text-brand hover:underline"
            >
              Шүүлтүүрийг цэвэрлэх
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((article, i) => (
              <ArticleCard key={article.slug} article={article} index={i} />
            ))}
          </div>
        )}

        {/* Calculator promo section */}
        <section className="mt-16 rounded-3xl bg-gradient-to-br from-brand/10 to-amber/5 border border-brand/20 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-1">🧮 Тооцоолуур</h2>
              <p className="text-sm text-foreground-muted">
                Будаг, хавтан болон бусад материалын тоо хэмжээг автоматаар тооцоол
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                href="/how-to/oorooniinhudgiiherh-songoh"
                className="px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors"
              >
                🎨 Будгийн тооцоолуур
              </Link>
              <Link
                href="/how-to/shalniidevsgerrtavihzaawar"
                className="px-4 py-2.5 rounded-xl border border-[var(--glass-border)] text-sm font-medium text-foreground-muted hover:border-brand/30 transition-colors"
              >
                🔲 Хавтангийн тооцоолуур
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
