import Link from 'next/link';
import type { Metadata } from 'next';
import { vendureShopFetch } from '@/lib/vendure';
import CategoryShell from './category-shell';
import { ProductCard } from '@/components/ui/ProductCard';
import type { SearchProduct } from './product-card';
import { FacetValueResult } from './filter-sidebar';
import { generateCategoryMetadata } from '@/lib/seo/metadata';
import { generateBreadcrumbSchema } from '@/lib/seo/structured-data';
import { JsonLd } from '@/components/common/JsonLd';
import { dbProductToCard, dbSupplierToCard, getDbSupplierProducts, getDbSuppliers } from '@/lib/supplier-products';

const PAGE_SIZE = 12;

// ─── GraphQL ────────────────────────────────────────────────

const GET_COLLECTION = `
  query GetCollection($slug: String!) {
    collection(slug: $slug) {
      id
      name
      slug
      customFields { icon }
      children {
        id
        name
        slug
        customFields { icon }
        productVariants(options: { take: 1 }) { totalItems }
      }
    }
  }
`;

const SEARCH_PRODUCTS = `
  query SearchProducts($input: SearchInput!) {
    search(input: $input) {
      totalItems
      items {
        productId
        productName
        slug
        productAsset { preview }
        priceWithTax {
          ... on PriceRange { __typename min max }
          ... on SinglePrice { __typename value }
        }
        currencyCode
        inStock
      }
      facetValues {
        count
        facetValue {
          id
          name
          facet { id name code }
        }
      }
    }
  }
`;

// ─── Types ──────────────────────────────────────────────────

type SearchParams = {
  sort?: string;
  page?: string;
  minPrice?: string;
  maxPrice?: string;
  facets?: string;
  availability?: string;
  promo?: string;
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

interface CollectionData {
  collection: {
    id: string;
    name: string;
    slug: string;
    customFields: { icon: string | null };
    children?: Array<{
      id: string;
      name: string;
      slug: string;
      customFields?: { icon: string | null };
      productVariants?: { totalItems: number };
    }>;
  } | null;
}

interface SearchData {
  search: {
    totalItems: number;
    items: SearchProduct[];
    facetValues: FacetValueResult[];
  };
}

// ─── Helpers ────────────────────────────────────────────────

function buildSortInput(sort?: string) {
  if (sort === 'price-asc') return { price: 'ASC' };
  if (sort === 'price-desc') return { price: 'DESC' };
  if (sort === 'new') return { name: 'ASC' };
  if (sort === 'rating') return { name: 'DESC' };
  return undefined;
}

// ─── Data fetching ──────────────────────────────────────────

async function getCollection(slug: string) {
  try {
    const data = await vendureShopFetch<CollectionData>(GET_COLLECTION, { slug });
    return data.collection;
  } catch {
    return null;
  }
}

async function searchProducts(slug: string, sp: SearchParams) {
  const page = Math.max(1, parseInt(sp.page ?? '1'));
  const facetValueIds = (sp.facets ?? '').split(',').filter(Boolean);
  const sortInput = buildSortInput(sp.sort);

  const minMNT = sp.minPrice ? parseInt(sp.minPrice) * 100 : undefined;
  const maxMNT = sp.maxPrice ? parseInt(sp.maxPrice) * 100 : undefined;

  const input: Record<string, unknown> = {
    collectionSlug: slug,
    groupByProduct: true,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    ...(sortInput ? { sort: sortInput } : {}),
    ...(facetValueIds.length ? { facetValueIds } : {}),
    ...(minMNT !== undefined && maxMNT !== undefined
      ? { priceRangeWithTax: { min: minMNT, max: maxMNT } }
      : {}),
    ...(sp.availability?.includes('pickup') ? { inStock: true } : {}),
  };

  try {
    const data = await vendureShopFetch<SearchData>(SEARCH_PRODUCTS, { input });
    return data.search;
  } catch {
    return null;
  }
}

// ─── Metadata ───────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { title: 'Ангилал олдсонгүй' };
  return generateCategoryMetadata({
    name: collection.name,
    slug,
    icon: collection.customFields?.icon ?? undefined,
  });
}

// ─── Page ───────────────────────────────────────────────────

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page ?? '1'));

  const [collection, searchResult, supplierProducts, suppliersResult] = await Promise.all([
    getCollection(slug),
    searchProducts(slug, sp),
    getDbSupplierProducts(),
    getDbSuppliers({ status: 'ACTIVE', take: 100 }),
  ]);
  const categorySlugs = new Set([slug, ...(collection?.children ?? []).map((child) => child.slug)]);
  const supplierById = new Map(suppliersResult.items.map((supplier) => {
    const card = dbSupplierToCard(supplier);
    return [card.id, card];
  }));
  const supplierCategoryProducts = supplierProducts
    .filter((product) => product.enabled && product.category && categorySlugs.has(product.category))
    .map((product) => dbProductToCard(product, supplierById.get(product.supplierId)));

  const totalItems = (searchResult?.totalItems ?? 0) + supplierCategoryProducts.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const facets = searchResult?.facetValues ?? [];
  const rawProducts = searchResult?.items ?? [];

  // Adapt SearchProduct → ProductCardData
  const products = [
    ...supplierCategoryProducts,
    ...rawProducts.map((p) => ({
    id: p.productId,
    variantId: p.productId,
    name: p.productName,
    slug: p.slug,
    image: p.productAsset?.preview ?? '',
    price: p.priceWithTax.__typename === 'SinglePrice' ? p.priceWithTax.value : (p.priceWithTax as any).min ?? 0,
    inStock: p.inStock,
    badge: !p.inStock ? ('ДУУССАН' as const) : undefined,
    })),
  ];

  const icon = collection?.customFields?.icon ?? '📦';
  const name = collection?.name ?? slug;
  const subcategories = collection?.children ?? [];

  return (
    <>
    <JsonLd schema={generateBreadcrumbSchema([
      { name: 'Нүүр', href: '/' },
      { name: name, href: `/category/${slug}` },
    ])} />
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] bg-surface/50 backdrop-blur-sm px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-foreground-muted">
            <Link href="/" className="hover:text-brand transition-colors">Нүүр</Link>
            <span>/</span>
            <span className="text-foreground">{name}</span>
          </nav>
          <h1 className="flex items-center gap-3 text-3xl font-display font-bold text-foreground">
            <span className="text-4xl">{icon}</span>
            <span>{name}</span>
          </h1>
        </div>
      </div>

      {/* Shell: sort bar + sidebar + grid */}
      <CategoryShell
        facets={facets}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        subcategories={subcategories}
      >
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--glass-border)] py-24 text-center">
            <p className="text-5xl">🔍</p>
            <p className="mt-3 text-base font-semibold text-foreground">Бүтээгдэхүүн олдсонгүй</p>
            <p className="mt-1 text-sm text-foreground-muted">Шүүлтүүрийг өөрчилж үзнэ үү</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </CategoryShell>
    </div>
    </>
  );
}
