import type { MetadataRoute } from 'next';
import { ARTICLES } from './how-to/articles';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shoptool.mn';

const CATEGORY_SLUGS = [
  'bagaj', 'barilga', 'santekhnik', 'tsakhilgaan',
  'budag', 'gerel', 'khaalga', 'shal',
  'garna', 'tavan', 'khaalts', 'khana',
];

async function getProductSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? 'http://localhost:13001/shop-api'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { search(input: { take: 1000, groupByProduct: true }) { items { slug } } }`,
      }),
      next: { revalidate: 3600 },
    });
    const json = await res.json();
    return (json.data?.search?.items ?? []).map((i: { slug: string }) => i.slug);
  } catch {
    // Return static fallback slugs in case server is down
    return [
      'makita-drill', 'bosch-vacuum', 'dulux-paint', 'stanley-kit',
      'philips-led', 'grohe-tap', 'quickstep-floor', 'schneider-panel',
    ];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productSlugs = await getProductSlugs();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/stores`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/trade`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/how-to`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
  ];

  const categoryPages: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url: `${BASE_URL}/category/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${BASE_URL}/product/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const articlePages: MetadataRoute.Sitemap = ARTICLES.map((article) => ({
    url: `${BASE_URL}/how-to/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...articlePages];
}
