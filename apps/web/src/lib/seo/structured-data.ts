const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shoptool.mn';

// ─── Product schema ───────────────────────────────────────────

export function generateProductSchema(product: {
  id: string;
  name: string;
  description?: string;
  slug: string;
  imageUrl?: string;
  price: number;           // minor units (÷100 for MNT display)
  salePrice?: number;
  brand?: string;
  sku?: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
}) {
  const priceAmount = product.price / 100;
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    url: `${BASE_URL}/product/${product.slug}`,
    image: product.imageUrl,
    sku: product.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'MNT',
      price: priceAmount.toFixed(2),
      availability: product.inStock !== false
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${BASE_URL}/product/${product.slug}`,
      seller: { '@type': 'Organization', name: 'shoptool.mn' },
    },
  };

  if (product.rating !== undefined && product.reviewCount !== undefined) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviewCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return schema;
}

// ─── Breadcrumb schema ────────────────────────────────────────

export function generateBreadcrumbSchema(items: { name: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.href.startsWith('http') ? item.href : `${BASE_URL}${item.href}`,
    })),
  };
}

// ─── Organization schema ──────────────────────────────────────

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'shoptool.mn',
    url: BASE_URL,
    logo: `${BASE_URL}/shoptool-logo.png`,
    description: 'Барилгын материалын ухаалаг шийдэл',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+976-7777-0000',
      contactType: 'customer service',
      availableLanguage: 'Mongolian',
    },
    sameAs: [
      'https://www.facebook.com/shoptool.mn',
      'https://www.instagram.com/shoptool.mn',
    ],
  };
}

// ─── Article schema ───────────────────────────────────────────

export function generateArticleSchema(article: {
  title: string;
  description: string;
  slug: string;
  author: string;
  date: string;
  imageUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: `${BASE_URL}/how-to/${article.slug}`,
    image: article.imageUrl,
    datePublished: article.date,
    dateModified: article.date,
    author: { '@type': 'Person', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: 'shoptool.mn',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/shoptool-logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/how-to/${article.slug}` },
  };
}

// ─── LocalBusiness schema ─────────────────────────────────────

export function generateLocalBusinessSchema(store: {
  id: string;
  name: string;
  address: string;
  district: string;
  phone: string;
  lat: number;
  lng: number;
  hours: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: `shoptool.mn — ${store.name}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: store.address,
      addressLocality: store.district,
      addressRegion: 'Улаанбаатар',
      addressCountry: 'MN',
    },
    telephone: store.phone,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: store.lat,
      longitude: store.lng,
    },
    openingHours: store.hours,
    url: BASE_URL,
    image: `${BASE_URL}/og-default.png`,
  };
}

// ─── Helper: inline JSON-LD script tag ────────────────────────
// Use this in server components (returns a <script> tag)

export function jsonLdScript(schema: object): string {
  return JSON.stringify(schema);
}
