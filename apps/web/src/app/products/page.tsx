import Link from 'next/link';
import { ChevronLeft, Flame, Package, Sparkles } from 'lucide-react';
import { ProductCard, type ProductCardData } from '@/components/ui/ProductCard';
import { dbProductToCard, getDbSupplierProducts, getDbSuppliers, supplierProductMatchesCategory, type DbSupplierProduct } from '@/lib/supplier-products';
import { vendureShopFetch, type VendureCollection } from '@/lib/vendure';

export const dynamic = 'force-dynamic';

const COLLECTIONS_QUERY = `
  query Collections {
    collections(options: { take: 60, topLevelOnly: true, sort: { position: ASC } }) {
      items {
        id
        name
        slug
        parentId
        children {
          id
          name
          slug
        }
        customFields { icon }
        productVariants(options: { take: 1 }) { totalItems }
      }
    }
  }
`;

const SEARCH_QUERY = `
  query ProductsForMode {
    search(input: { take: 80, sort: { name: ASC } }) {
      totalItems
      items {
        productId
        productVariantId
        productName
        slug
        productAsset { preview }
        priceWithTax { ... on SinglePrice { value } }
        inStock
      }
    }
  }
`;

type ProductWithCategory = ProductCardData & {
  category?: string | null;
  source: 'supplier' | 'catalog';
};

type ProductSection = {
  title: string;
  products: ProductWithCategory[];
};

type SearchParams = Promise<{ mode?: string }>;

async function getCollections() {
  try {
    const data = await vendureShopFetch<{ collections: { items: VendureCollection[] } }>(
      COLLECTIONS_QUERY,
      undefined,
      { revalidate: 0 },
    );
    return (data.collections?.items ?? []).filter((item) => item.slug !== '__root_collection__');
  } catch {
    return [];
  }
}

async function getCatalogProducts(): Promise<ProductWithCategory[]> {
  try {
    const data = await vendureShopFetch<{ search: { items: any[] } }>(
      SEARCH_QUERY,
      undefined,
      { revalidate: 0 },
    );
    return (data.search?.items ?? []).map((item: any, index: number) => ({
      id: item.productId,
      variantId: item.productVariantId,
      name: item.productName,
      slug: item.slug,
      image: item.productAsset?.preview ?? '',
      price: item.priceWithTax?.value ?? 0,
      rating: 0,
      reviewCount: 0,
      badge: index === 0 ? 'ТОП' : index < 8 ? 'ШИНЭ' : undefined,
      inStock: item.inStock,
      source: 'catalog' as const,
    }));
  } catch {
    return [];
  }
}

function supplierProductsToCards(products: DbSupplierProduct[], suppliers: Awaited<ReturnType<typeof getDbSuppliers>>['items']): ProductWithCategory[] {
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  return products
    .filter((product) => product.enabled !== false)
    .map((product) => ({
      ...dbProductToCard(product, supplierById.get(product.supplierId)),
      category: product.category,
      source: 'supplier' as const,
    }));
}

function groupProducts(products: ProductWithCategory[], categories: VendureCollection[]): ProductSection[] {
  const used = new Set<string>();
  const sections: ProductSection[] = [];

  for (const category of categories) {
    const categoryProducts = products.filter((product) => {
      if (product.source !== 'supplier' || used.has(product.variantId)) return false;
      return supplierProductMatchesCategory(product, category, true);
    });

    if (categoryProducts.length > 0) {
      categoryProducts.forEach((product) => used.add(product.variantId));
      sections.push({ title: category.name, products: categoryProducts });
    }
  }

  const remaining = products.filter((product) => !used.has(product.variantId));
  if (remaining.length > 0) sections.push({ title: 'Бусад бараа', products: remaining });
  return sections;
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const mode = params.mode === 'sale' ? 'sale' : 'new';
  const [collections, supplierProducts, catalogProducts, suppliersResult] = await Promise.all([
    getCollections(),
    getDbSupplierProducts(),
    getCatalogProducts(),
    getDbSuppliers({ status: 'ACTIVE', take: 100 }),
  ]);

  const allProducts = [
    ...supplierProductsToCards(supplierProducts, suppliersResult.items),
    ...catalogProducts,
  ];
  const visibleProducts = mode === 'sale'
    ? allProducts
      .filter((product) => product.originalPrice && product.originalPrice > product.price)
      .map((product) => ({ ...product, badge: 'ХЯМДРАЛ' as const }))
    : allProducts.map((product, index) => ({
      ...product,
      badge: index === 0 ? 'ТОП' as const : index < 8 ? 'ШИНЭ' as const : product.badge,
    }));
  const sections = groupProducts(visibleProducts, collections);
  const title = mode === 'sale' ? 'Хямдралтай бараа' : 'Шинэ бараа';
  const subtitle = mode === 'sale'
    ? 'Хямдралтай бүтээгдэхүүнүүдийг төрлөөр ангиллаа'
    : 'Сүүлд нэмэгдсэн бүтээгдэхүүнүүдийг төрлөөр ангиллаа';
  const Icon = mode === 'sale' ? Flame : Sparkles;

  return (
    <main className="min-h-screen bg-dark pb-24 lg:pb-10">
      <div className="border-b border-[var(--glass-border)] bg-surface/50 px-4 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl sm:px-6">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground-muted hover:text-brand">
            <ChevronLeft size={16} /> Нүүр рүү буцах
          </Link>
          <div className="mb-2 flex items-center gap-3">
            <Icon size={24} className="text-brand" />
            <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
          </div>
          <p className="text-sm text-foreground-muted">{subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--glass-border)] py-20 text-center">
            <Package size={42} className="mx-auto mb-3 text-foreground-muted" />
            <p className="text-sm text-foreground-muted">Энэ жагсаалтад бараа алга байна.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <h2 className="font-display text-2xl font-bold text-foreground">{section.title}</h2>
                  <span className="text-xs font-semibold text-foreground-muted">
                    {section.products.length.toLocaleString('mn-MN')} бараа
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {section.products.map((product, index) => (
                    <ProductCard key={`${product.source}-${product.variantId}`} product={product} index={index} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
