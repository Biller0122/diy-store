import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://diy-store.mn';
const SITE_NAME = 'DIY Store';
const DEFAULT_TITLE = 'DIY Store — Барилга. Засвар. Бүтээл.';
const DEFAULT_DESCRIPTION =
  'Монголын хамгийн том DIY, барилгын материал, багаж хэрэгслийн онлайн дэлгүүр. 10,000+ бараа нэг дор.';
const DEFAULT_OG = `${BASE_URL}/og-default.png`;

// ─── Root layout metadata (re-exported for layout.tsx) ────────

export const rootMetadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: ['DIY', 'барилга', 'засвар', 'багаж', 'будаг', 'сантехник', 'Монгол', 'дэлгүүр', 'онлайн'],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: 'mn_MN',
    images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG],
  },
};

// ─── Page-specific helpers ────────────────────────────────────

export function generatePageMetadata(opts: {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const url = opts.path ? `${BASE_URL}${opts.path}` : undefined;
  const image = opts.image ?? DEFAULT_OG;

  return {
    title: opts.title,
    description: opts.description ?? DEFAULT_DESCRIPTION,
    robots: opts.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: opts.title,
      description: opts.description ?? DEFAULT_DESCRIPTION,
      url,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      title: opts.title,
      description: opts.description ?? DEFAULT_DESCRIPTION,
      images: [image],
    },
    alternates: url ? { canonical: url } : undefined,
  };
}

export function generateProductMetadata(product: {
  name: string;
  description?: string;
  slug: string;
  imageUrl?: string;
  price?: number;
  brand?: string;
}): Metadata {
  const title = `${product.name}${product.brand ? ` — ${product.brand}` : ''}`;
  const description = product.description
    ? product.description.slice(0, 155)
    : `${product.name} — DIY Store дэлгүүрт авах боломжтой. Шуурхай хүргэлт, баталгаат бараа.`;
  const image = product.imageUrl
    ? `${BASE_URL}/api/og?type=product&name=${encodeURIComponent(product.name)}&price=${product.price ?? 0}&image=${encodeURIComponent(product.imageUrl)}`
    : DEFAULT_OG;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/product/${product.slug}`,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { title, description, images: [image] },
    alternates: { canonical: `${BASE_URL}/product/${product.slug}` },
  };
}

export function generateCategoryMetadata(category: {
  name: string;
  slug: string;
  icon?: string;
  productCount?: number;
}): Metadata {
  const title = `${category.name} — ${SITE_NAME}`;
  const description = `${category.name} бараа. ${category.productCount ? `${category.productCount}+ бүтээгдэхүүн` : 'Шилмэл бүтээгдэхүүн'} нэг дор. Шуурхай хүргэлт.`;
  const image = `${BASE_URL}/api/og?type=category&name=${encodeURIComponent(category.name)}&icon=${encodeURIComponent(category.icon ?? '📦')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/category/${category.slug}`,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { title, description, images: [image] },
    alternates: { canonical: `${BASE_URL}/category/${category.slug}` },
  };
}

export function generateArticleMetadata(article: {
  title: string;
  description: string;
  slug: string;
  author: string;
  date: string;
  emoji?: string;
}): Metadata {
  const description = article.description.slice(0, 155);
  const image = `${BASE_URL}/api/og?type=article&title=${encodeURIComponent(article.title)}&emoji=${encodeURIComponent(article.emoji ?? '📖')}`;

  return {
    title: article.title,
    description,
    authors: [{ name: article.author }],
    openGraph: {
      title: article.title,
      description,
      url: `${BASE_URL}/how-to/${article.slug}`,
      type: 'article',
      publishedTime: article.date,
      authors: [article.author],
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { title: article.title, description, images: [image] },
    alternates: { canonical: `${BASE_URL}/how-to/${article.slug}` },
  };
}
