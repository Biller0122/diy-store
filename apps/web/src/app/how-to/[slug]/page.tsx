import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ARTICLES } from '../articles';
import ArticleClient from './article-client';
import { generateArticleMetadata } from '@/lib/seo/metadata';
import { generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo/structured-data';
import { JsonLd } from '@/components/common/JsonLd';

export async function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) return { title: 'Нийтлэл олдсонгүй' };
  return generateArticleMetadata({
    title: article.title,
    description: article.description,
    slug: article.slug,
    author: article.author,
    date: article.date,
    emoji: article.emoji,
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) notFound();

  const related = ARTICLES.filter(
    (a) => a.slug !== slug && (a.category === article.category || Math.random() > 0.5),
  ).slice(0, 3);

  return (
    <>
    <JsonLd schema={generateArticleSchema({ title: article.title, description: article.description, slug: article.slug, author: article.author, date: article.date })} />
    <JsonLd schema={generateBreadcrumbSchema([
      { name: 'Нүүр', href: '/' },
      { name: 'DIY Зөвлөгөө', href: '/how-to' },
      { name: article.title, href: `/how-to/${article.slug}` },
    ])} />
    <div className="min-h-screen bg-dark">
      {/* Breadcrumb */}
      <div className="border-b border-[var(--glass-border)] bg-surface/50 backdrop-blur-sm px-4 py-3">
        <nav className="mx-auto flex max-w-5xl items-center gap-1.5 text-xs text-foreground-muted flex-wrap">
          <Link href="/" className="hover:text-brand transition-colors">Нүүр</Link>
          <span>/</span>
          <Link href="/how-to" className="hover:text-brand transition-colors">DIY Зөвлөгөө</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{article.title}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* ── Main Content ── */}
          <main>
            {/* Hero */}
            <div className={`relative h-64 rounded-2xl bg-gradient-to-br ${article.gradient} flex items-center justify-center mb-8 overflow-hidden`}>
              <span className="text-8xl">{article.emoji}</span>
              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs font-medium text-white border border-white/10">
                  {article.category}
                </span>
              </div>
            </div>

            {/* Header */}
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4 leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted mb-6 pb-6 border-b border-[var(--glass-border)]">
              <span>✍️ {article.author}</span>
              <span>
                📅{' '}
                {new Date(article.date).toLocaleDateString('mn-MN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span>⏱ {article.readTime} минут унших</span>
            </div>

            {/* Description */}
            <p className="text-foreground-muted leading-relaxed mb-8">{article.description}</p>

            {/* Article body (rendered as prose) */}
            <ArticleClient content={article.content} articleSlug={slug} />

          </main>

          {/* ── Sidebar ── */}
          <aside className="space-y-5">
            {/* Related articles */}
            {related.length > 0 && (
              <div className="bg-card rounded-2xl border border-[var(--glass-border)] p-4">
                <h3 className="font-bold text-foreground text-sm mb-4">📖 Холбоотой нийтлэл</h3>
                <div className="space-y-3">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/how-to/${r.slug}`}
                      className="flex gap-3 group"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center shrink-0 text-2xl`}>
                        {r.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground group-hover:text-brand transition-colors line-clamp-2">
                          {r.title}
                        </p>
                        <p className="text-xs text-foreground-muted mt-0.5">{r.readTime} мин</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/how-to"
                  className="block text-center text-xs text-brand hover:underline mt-4"
                >
                  Бүх нийтлэл харах →
                </Link>
              </div>
            )}

            {/* Related products CTA */}
            <div className="bg-gradient-to-br from-brand/10 to-amber/5 rounded-2xl border border-brand/20 p-4">
              <h3 className="font-bold text-foreground text-sm mb-2">🛒 Холбогдох бараа</h3>
              <p className="text-xs text-foreground-muted mb-3">
                Энэ нийтлэлд хэрэглэгдсэн барааг манай дэлгүүрээс авах боломжтой.
              </p>
              <Link
                href="/"
                className="block text-center py-2.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors"
              >
                Дэлгүүр хэсэх
              </Link>
            </div>
          </aside>
        </div>

        {/* Bottom related */}
        <section className="mt-12 pt-8 border-t border-[var(--glass-border)]">
          <h2 className="text-xl font-bold text-foreground mb-6">Бусад нийтлэлүүд</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/how-to/${r.slug}`}
                className="group bg-card rounded-2xl border border-[var(--glass-border)] overflow-hidden hover:border-[var(--glass-border-hover)] transition-colors"
              >
                <div className={`h-32 bg-gradient-to-br ${r.gradient} flex items-center justify-center text-5xl`}>
                  {r.emoji}
                </div>
                <div className="p-4">
                  <span className="text-xs text-brand font-medium">{r.category}</span>
                  <h3 className="font-bold text-foreground text-sm mt-1 line-clamp-2 group-hover:text-brand transition-colors">
                    {r.title}
                  </h3>
                  <p className="text-xs text-foreground-muted mt-2">⏱ {r.readTime} мин</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
    </>
  );
}
