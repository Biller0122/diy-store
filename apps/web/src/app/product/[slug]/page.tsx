import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { vendureShopFetch } from '@/lib/vendure';
import ImageGallery from './image-gallery';
import BuyBox, { ProductVariant, OptionGroup } from './buy-box';
import ProductTabs from './product-tabs';
import { generateProductMetadata } from '@/lib/seo/metadata';
import { generateBreadcrumbSchema, generateProductSchema } from '@/lib/seo/structured-data';
import { JsonLd } from '@/components/common/JsonLd';
import { getDbSupplierById, getDbSupplierProducts, type DbSupplierProduct } from '@/lib/supplier-products';

// ─── GraphQL ─────────────────────────────────────────────────

const GET_PRODUCT = `
  query GetProduct($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset { id preview source }
      assets { id preview source }
      variants {
        id
        name
        sku
        price
        priceWithTax
        currencyCode
        stockLevel
        options {
          id name code
          group { id name code }
        }
      }
      optionGroups {
        id name code
        options { id name code }
      }
      facetValues {
        id name
        facet { id name code }
      }
      collections {
        id name slug
        breadcrumbs { id name slug }
      }
    }
  }
`;

const GET_RELATED = `
  query GetRelated($collectionSlug: String!) {
    search(input: { collectionSlug: $collectionSlug, take: 5, groupByProduct: true }) {
      items {
        productId
        productName
        slug
        productAsset { preview }
        priceWithTax {
          ... on SinglePrice { __typename value }
          ... on PriceRange   { __typename min max }
        }
        currencyCode
        inStock
      }
    }
  }
`;

// ─── Types ───────────────────────────────────────────────────

interface Asset { id: string; preview: string; source: string }

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset: Asset | null;
  assets: Asset[];
  variants: ProductVariant[];
  optionGroups: OptionGroup[];
  facetValues: { id: string; name: string; facet: { id: string; name: string; code: string } }[];
  collections: { id: string; name: string; slug: string; breadcrumbs: { id: string; name: string; slug: string }[] }[];
  supplier?: {
    id: string;
    name: string;
    slug?: string;
    district?: string;
    lat?: number;
    lng?: number;
  };
}

interface RelatedItem {
  productId: string;
  productName: string;
  slug: string;
  productAsset: { preview: string } | null;
  priceWithTax:
    | { __typename: 'SinglePrice'; value: number }
    | { __typename: 'PriceRange'; min: number; max: number };
  currencyCode: string;
  inStock: boolean;
}

// ─── Data fetching ────────────────────────────────────────────

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const data = await vendureShopFetch<{ product: Product | null }>(GET_PRODUCT, { slug });
    if (data.product) return data.product;
  } catch {
    // Supplier products are stored in the custom supplier catalog.
  }
  return getSupplierProductAsProduct(slug);
}

async function getRelated(collectionSlug: string, excludeSlug: string): Promise<RelatedItem[]> {
  try {
    const data = await vendureShopFetch<{ search: { items: RelatedItem[] } }>(GET_RELATED, {
      collectionSlug,
    });
    return data.search.items.filter((i) => i.slug !== excludeSlug).slice(0, 4);
  } catch {
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function formatMNT(minor: number) {
  return `₮${Math.round(minor / 100).toLocaleString('mn-MN')}`;
}

function relatedPrice(p: RelatedItem['priceWithTax']): string {
  if (p.__typename === 'SinglePrice') return formatMNT(p.value);
  if (p.min === p.max) return formatMNT(p.min);
  return `${formatMNT(p.min)} – ${formatMNT(p.max)}`;
}

async function getSupplierProductAsProduct(slug: string): Promise<Product | null> {
  const products = await getDbSupplierProducts();
  const product = products.find((item) => item.slug === slug && item.enabled);
  if (!product) return null;

  const asset = supplierAsset(product);
  const category = product.category?.trim();
  const supplier = await getDbSupplierById(product.supplierId);
  if (supplier?.status && supplier.status !== 'ACTIVE') return null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    featuredAsset: asset,
    assets: asset ? [asset] : [],
    variants: [{
      id: product.id,
      name: product.name,
      sku: product.slug,
      price: product.price,
      priceWithTax: product.price,
      currencyCode: 'MNT',
      stockLevel: product.stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      options: [],
    }],
    optionGroups: [],
    facetValues: category ? [{
      id: `supplier-category-${category}`,
      name: category,
      facet: { id: 'supplier-category', name: 'Ангилал', code: 'supplier-category' },
    }] : [],
    collections: category ? [{
      id: category,
      name: category,
      slug: category,
      breadcrumbs: [{ id: category, name: category, slug: category }],
    }] : [],
    supplier: {
      id: product.supplierId,
      name: supplier?.businessName ?? 'Нийлүүлэгч',
      slug: supplier?.slug,
      district: supplier?.district ?? undefined,
      lat: supplier?.lat ?? undefined,
      lng: supplier?.lng ?? undefined,
    },
  };
}

function supplierAsset(product: DbSupplierProduct): Asset | null {
  if (!product.image) return null;
  return {
    id: `supplier-product-${product.id}`,
    preview: product.image,
    source: product.image,
  };
}

// ─── Metadata ────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Бүтээгдэхүүн олдсонгүй' };
  return generateProductMetadata({
    name: product.name,
    slug: product.slug,
    description: product.description?.replace(/<[^>]+>/g, '').slice(0, 160),
    imageUrl: product.featuredAsset?.preview,
    price: product.variants[0]?.priceWithTax,
  });
}

// ─── Page ─────────────────────────────────────────────────────

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  // Breadcrumbs from the first non-root collection
  const breadcrumbs =
    product.collections[0]?.breadcrumbs.filter((b) => b.slug !== '__root_collection__') ?? [];

  // Related products from first collection
  const firstCollectionSlug = product.collections[0]?.slug ?? '';
  const related = firstCollectionSlug
    ? await getRelated(firstCollectionSlug, product.slug)
    : [];


  // Build asset list — prefer dedicated assets, fall back to featuredAsset
  const allAssets =
    product.assets.length > 0
      ? product.assets
      : product.featuredAsset
        ? [product.featuredAsset]
        : [];

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Нүүр', href: '/' },
    ...breadcrumbs.map((b) => ({ name: b.name, href: `/category/${b.slug}` })),
    { name: product.name, href: `/product/${product.slug}` },
  ]);

  return (
    <>
      <JsonLd schema={generateProductSchema({
        id: product.id,
        name: product.name,
        description: product.description?.replace(/<[^>]+>/g, ''),
        slug: product.slug,
        imageUrl: product.featuredAsset?.preview,
        price: product.variants[0]?.priceWithTax ?? 0,
        sku: product.variants[0]?.sku,
        inStock: product.variants.some((v) => v.stockLevel !== 'OUT_OF_STOCK'),
      })} />
      <JsonLd schema={breadcrumbSchema} />

      <div className="min-h-screen bg-dark pb-28 lg:pb-6">
        {/* Breadcrumb */}
        <div className="border-b border-[var(--glass-border)] bg-card px-4 py-3">
          <nav className="mx-auto flex max-w-6xl items-center gap-1.5 text-xs text-foreground-muted flex-wrap">
            <Link href="/" className="hover:text-brand">Нүүр</Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-1.5">
                <span>/</span>
                <Link href={`/category/${crumb.slug}`} className="hover:text-brand">
                  {crumb.name}
                </Link>
              </span>
            ))}
            <span>/</span>
            <span className="max-w-xs truncate text-foreground-muted">{product.name}</span>
          </nav>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6">
          {/* Top section: gallery + buy box */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ImageGallery assets={allAssets} productName={product.name} />
            <BuyBox
              productId={product.id}
              productName={product.name}
              slug={product.slug}
              image={product.featuredAsset?.preview ?? null}
              variants={product.variants}
              optionGroups={product.optionGroups}
              avgRating={4.7}
              reviewCount={18}
              supplierId={product.supplier?.id}
              supplierName={product.supplier?.name}
              supplierSlug={product.supplier?.slug}
              supplierDistrict={product.supplier?.district}
              supplierLat={product.supplier?.lat}
              supplierLng={product.supplier?.lng}
            />
          </div>

          {/* Tabs */}
          <div className="mt-10 rounded-2xl bg-card p-5 border border-[var(--glass-border)]">
            <ProductTabs
              productId={product.id}
              description={product.description}
              facetValues={product.facetValues}
              variants={product.variants.map((v) => ({ sku: v.sku, name: v.name }))}
            />
          </div>

          {/* Related products */}
          {related.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-bold text-foreground">Төстэй бүтээгдэхүүн</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {related.map((item) => (
                  <Link
                    key={item.productId}
                    href={`/product/${item.slug}`}
                    className="group rounded-2xl bg-card p-3 border border-[var(--glass-border)] transition hover:shadow-md hover:border-amber-500/40"
                  >
                    <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-surface">
                      {item.productAsset ? (
                        <Image
                          src={`${item.productAsset.preview}?preset=medium`}
                          alt={item.productName}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl text-foreground-muted/30">📦</div>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs font-medium text-foreground group-hover:text-brand">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {relatedPrice(item.priceWithTax)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
