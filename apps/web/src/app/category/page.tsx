import { Package } from 'lucide-react';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { vendureShopFetch, type VendureCollection } from '@/lib/vendure';
import { getDbSupplierProducts, getSupplierProductCategoryCount } from '@/lib/supplier-products';

export const dynamic = 'force-dynamic';

const COLLECTIONS_QUERY = `
  query Collections {
    collections(options: { take: 48, topLevelOnly: true, sort: { position: ASC } }) {
      items {
        id
        name
        slug
        parentId
        children {
          id
          name
          slug
          customFields { icon }
          productVariants(options: { take: 1 }) { totalItems }
        }
        customFields { icon }
        productVariants(options: { take: 1 }) { totalItems }
      }
    }
  }
`;

type CollectionWithCount = VendureCollection & {
  productVariants?: { totalItems: number };
};

async function getCollections() {
  try {
    const data = await vendureShopFetch<{ collections: { items: CollectionWithCount[] } }>(
      COLLECTIONS_QUERY,
      undefined,
      { revalidate: 0 },
    );
    return data.collections.items.filter((item) => item.slug !== '__root_collection__');
  } catch {
    return [];
  }
}

export default async function CategoryIndexPage() {
  const [collections, supplierProducts] = await Promise.all([
    getCollections(),
    getDbSupplierProducts(),
  ]);

  return (
    <div className="min-h-screen bg-dark pb-24 lg:pb-8">
      <div className="border-b border-[var(--glass-border)] bg-surface/50 px-4 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl sm:px-6">
          <div className="mb-2 flex items-center gap-3">
            <Package size={24} className="text-brand" />
            <h1 className="font-display text-3xl font-bold text-foreground">Ангилал</h1>
          </div>
          <p className="text-foreground-muted">{collections.length} backend ангилал</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {collections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--glass-border)] py-20 text-center">
            <p className="text-sm text-foreground-muted">Backend дээр ангилал бүртгэгдээгүй байна.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {collections.map((category, index) => (
              <CategoryCard
                key={category.id}
                name={category.name}
                slug={category.slug}
                icon={category.customFields?.icon ?? '📦'}
                productCount={(category.productVariants?.totalItems ?? 0) + getSupplierProductCategoryCount(supplierProducts, category, true)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
