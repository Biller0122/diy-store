'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { ProductCard, type ProductCardData } from '@/components/ui/ProductCard';
import { trackSearch, trackViewItemList } from '@/lib/analytics/ga4';
import { vendureShopFetch } from '@/lib/vendure';

// ─── Types ────────────────────────────────────────────────────

interface AlgoliaHit {
  objectID: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number | null;
  brand: string;
  category: string;
  categorySlug: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  imageUrl: string;
  tags: string[];
}

type ProductCategory = {
  id: string;
  name: string;
  slug: string;
};

type SortOption = 'relevant' | 'price_asc' | 'price_desc' | 'rating';

const SORT_LABELS: Record<SortOption, string> = {
  relevant:   'Хамааралтай',
  price_asc:  'Үнэ өсөх',
  price_desc: 'Үнэ буурах',
  rating:     'Үнэлгээ',
};

// ─── Algolia search (with mock fallback) ─────────────────────

const ALGOLIA_APP_ID    = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const ALGOLIA_INDEX     = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? 'diy_products';

const SUPPLIER_PRODUCTS_QUERY = `
  query SupplierProducts {
    supplierProducts {
      items {
        id
        supplierId
        name
        slug
        image
        price
        originalPrice
        category
        stock
        enabled
      }
    }
  }
`;

const PRODUCT_CATEGORIES_QUERY = `
  query ProductCategories {
    collections(options: { take: 100, sort: { position: ASC } }) {
      items {
        id
        name
        slug
      }
    }
  }
`;

async function searchSupplierProducts(query: string, filters: {
  category?: string;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  sort?: SortOption;
}, categoryNames: Record<string, string>): Promise<AlgoliaHit[]> {
  try {
    const data = await vendureShopFetch<{ supplierProducts: { items: Array<{
      id: string;
      supplierId: string;
      name: string;
      slug: string;
      image?: string | null;
      price: number;
      originalPrice?: number | null;
      category?: string | null;
      stock: number;
      enabled: boolean;
    }> } }>(SUPPLIER_PRODUCTS_QUERY, undefined, { revalidate: 0 });

    const q = query.trim().toLowerCase();
    let hits = data.supplierProducts.items
      .filter((item) => item.enabled)
      .filter((item) => !q ||
        item.name.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        (item.category ?? '').toLowerCase().includes(q)
      )
      .filter((item) => !filters.category || (item.category ?? 'supplier') === filters.category)
      .filter((item) => !filters.inStock || item.stock > 0)
      .filter((item) => !filters.priceMin || item.price >= filters.priceMin)
      .filter((item) => !filters.priceMax || item.price <= filters.priceMax)
      .map((item) => ({
        objectID: `supplier-${item.id}`,
        name: item.name,
        slug: item.slug,
        price: item.price,
        salePrice: item.originalPrice ?? null,
        brand: 'Нийлүүлэгч',
        category: categoryNames[item.category ?? ''] || item.category || 'Нийлүүлэгч',
        categorySlug: item.category || 'supplier',
        rating: 0,
        reviewCount: 0,
        inStock: item.stock > 0,
        imageUrl: item.image ?? '',
        tags: [item.category ?? '', item.slug],
      }));

    if (filters.sort === 'price_asc') hits = [...hits].sort((a, b) => a.price - b.price);
    if (filters.sort === 'price_desc') hits = [...hits].sort((a, b) => b.price - a.price);
    return hits;
  } catch {
    return [];
  }
}

async function searchAlgolia(query: string, filters: {
  category?: string;
  brand?: string;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  sort?: SortOption;
}, categoryNames: Record<string, string>): Promise<{ hits: AlgoliaHit[]; total: number; brands: string[]; categories: string[] }> {
  const supplierHits = await searchSupplierProducts(query, filters, categoryNames);

  if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
    const hits = supplierHits;
    const brands = [...new Set(supplierHits.map(h => h.brand))];
    const categories = [...new Set(supplierHits.map(h => h.categorySlug))];
    return { hits, total: hits.length, brands, categories };
  }

  // Real Algolia search (v5 API)
  const { algoliasearch: createClient } = await import('algoliasearch');
  const client = createClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

  const filterParts: string[] = [];
  if (filters.category) filterParts.push(`categorySlug:"${filters.category}"`);
  if (filters.brand)    filterParts.push(`brand:"${filters.brand}"`);
  if (filters.inStock)  filterParts.push('inStock:true');
  if (filters.priceMin) filterParts.push(`price >= ${filters.priceMin}`);
  if (filters.priceMax) filterParts.push(`price <= ${filters.priceMax}`);

  const indexName = filters.sort === 'price_asc'
    ? `${ALGOLIA_INDEX}_price_asc`
    : filters.sort === 'price_desc'
    ? `${ALGOLIA_INDEX}_price_desc`
    : ALGOLIA_INDEX;

  const result = await client.searchSingleIndex({
    indexName,
    searchParams: {
      query,
      filters: filterParts.join(' AND ') || undefined,
      facets: ['brand', 'categorySlug'],
      hitsPerPage: 48,
    },
  });

  const facets = (result as any).facets ?? {};
  const brands     = Object.keys(facets.brand ?? {});
  const categories = Object.keys(facets.categorySlug ?? {});
  const hits = [...supplierHits, ...(result.hits as unknown as AlgoliaHit[])];
  return { hits, total: hits.length, brands: [...new Set([...brands, ...supplierHits.map(h => h.brand)])], categories: [...new Set([...categories, ...supplierHits.map(h => h.categorySlug)])] };
}

// ─── Hit → ProductCard adapter ────────────────────────────────

function hitToCard(hit: AlgoliaHit): ProductCardData {
  return {
    id: hit.objectID,
    variantId: hit.objectID,
    name: hit.name,
    slug: hit.slug,
    image: hit.imageUrl,
    price: hit.price,
    originalPrice: hit.salePrice ?? undefined,
    rating: hit.rating,
    reviewCount: hit.reviewCount,
    inStock: hit.inStock,
    badge: hit.salePrice ? 'ХЯМДРАЛ' : undefined,
  };
}

// ─── Skeleton ─────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border border-[var(--glass-border)] overflow-hidden animate-pulse">
          <div className="aspect-square bg-surface" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-surface rounded-lg w-3/4" />
            <div className="h-4 bg-surface rounded-lg w-1/2" />
            <div className="h-6 bg-surface rounded-lg w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Filter sidebar ───────────────────────────────────────────

function FilterSidebar({
  brands, categories, activeCategory, activeBrand,
  inStockOnly, priceMin, priceMax, categoryNames,
  onChange,
}: {
  brands: string[];
  categories: string[];
  categoryNames: Record<string, string>;
  activeCategory: string;
  activeBrand: string;
  inStockOnly: boolean;
  priceMin: string;
  priceMax: string;
  onChange: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground-muted mb-3">Ангилал</h3>
        <div className="space-y-1">
          <button onClick={() => onChange('category', '')}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${!activeCategory ? 'bg-brand/10 text-brand font-semibold' : 'text-foreground-muted hover:text-foreground hover:bg-white/5'}`}>
            Бүгд
          </button>
          {categories.map((slug) => (
            <button key={slug} onClick={() => onChange('category', slug)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${activeCategory === slug ? 'bg-brand/10 text-brand font-semibold' : 'text-foreground-muted hover:text-foreground hover:bg-white/5'}`}>
              {categoryNames[slug] ?? slug}
            </button>
          ))}
        </div>
      </div>

      {/* Brand */}
      {brands.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground-muted mb-3">Брэнд</h3>
          <div className="space-y-1">
            <button onClick={() => onChange('brand', '')}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${!activeBrand ? 'bg-brand/10 text-brand font-semibold' : 'text-foreground-muted hover:text-foreground hover:bg-white/5'}`}>
              Бүгд
            </button>
            {brands.map((brand) => (
              <button key={brand} onClick={() => onChange('brand', brand)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${activeBrand === brand ? 'bg-brand/10 text-brand font-semibold' : 'text-foreground-muted hover:text-foreground hover:bg-white/5'}`}>
                {brand}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground-muted mb-3">Үнэ (₮)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number" placeholder="Мин" value={priceMin}
            onChange={(e) => onChange('priceMin', e.target.value)}
            className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-brand/50"
          />
          <span className="text-foreground-muted text-sm">—</span>
          <input
            type="number" placeholder="Макс" value={priceMax}
            onChange={(e) => onChange('priceMax', e.target.value)}
            className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-brand/50"
          />
        </div>
      </div>

      {/* In stock toggle */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground-muted mb-3">Бэлэн байдал</h3>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div
            onClick={() => onChange('inStock', !inStockOnly)}
            className={`relative w-10 h-5 rounded-full transition-colors ${inStockOnly ? 'bg-brand' : 'bg-surface border border-[var(--glass-border)]'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${inStockOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-foreground-muted">Зөвхөн бэлэн</span>
        </label>
      </div>
    </div>
  );
}

// ─── Main search content ──────────────────────────────────────

function SearchContent() {
  const router      = useRouter();
  const params      = useSearchParams();
  const query       = params.get('q') ?? '';
  const [localQ, setLocalQ] = useState(query);

  const [hits, setHits]           = useState<AlgoliaHit[]>([]);
  const [total, setTotal]         = useState(0);
  const [brands, setBrands]       = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [backendCategories, setBackendCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [activeCategory, setActiveCategory] = useState('');
  const [activeBrand, setActiveBrand]       = useState('');
  const [inStockOnly, setInStockOnly]       = useState(false);
  const [priceMin, setPriceMin]             = useState('');
  const [priceMax, setPriceMax]             = useState('');
  const [sort, setSort]                     = useState<SortOption>('relevant');

  const filterCount = [activeCategory, activeBrand, inStockOnly, priceMin, priceMax]
    .filter(Boolean).length;
  const categoryNames = useMemo(
    () => Object.fromEntries(backendCategories.map((category) => [category.slug, category.name])),
    [backendCategories],
  );
  const filterCategories = useMemo(
    () => backendCategories.map((category) => category.slug),
    [backendCategories],
  );

  useEffect(() => {
    let mounted = true;
    vendureShopFetch<{ collections: { items: ProductCategory[] } }>(
      PRODUCT_CATEGORIES_QUERY,
      undefined,
      { revalidate: 0 },
    )
      .then((data) => {
        if (!mounted) return;
        setBackendCategories(data.collections.items.filter((item) => item.slug !== '__root_collection__'));
      })
      .catch(() => {
        if (mounted) setBackendCategories([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    searchAlgolia(query, {
      category: activeCategory || undefined,
      brand:    activeBrand || undefined,
      inStock:  inStockOnly || undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      sort,
    }, categoryNames).then(({ hits, total, brands, categories }) => {
      setHits(hits);
      setTotal(total);
      setBrands(brands);
      setCategories(categories.length ? categories : filterCategories);
      trackSearch(query, total);
      if (hits.length > 0) trackViewItemList('Search results', hits.slice(0, 12).map(h => ({ id: h.objectID, variantId: h.objectID, name: h.name, price: h.price })));
    }).finally(() => setLoading(false));
  }, [query, activeCategory, activeBrand, inStockOnly, priceMin, priceMax, sort, categoryNames, filterCategories]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (localQ.trim()) router.push(`/search?q=${encodeURIComponent(localQ.trim())}`);
  }

  function handleFilterChange(key: string, val: any) {
    if (key === 'category') setActiveCategory(val);
    if (key === 'brand')    setActiveBrand(val);
    if (key === 'inStock')  setInStockOnly(val);
    if (key === 'priceMin') setPriceMin(val);
    if (key === 'priceMax') setPriceMax(val);
  }

  function clearAllFilters() {
    setActiveCategory('');
    setActiveBrand('');
    setInStockOnly(false);
    setPriceMin('');
    setPriceMax('');
  }

  return (
    <div className="min-h-screen bg-dark pb-16">
      {/* Search header */}
      <div className="border-b border-[var(--glass-border)] bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSearch} className="flex items-center gap-3 bg-surface border border-[var(--glass-border)] rounded-2xl px-4 py-3 max-w-2xl">
            <Search size={16} className="text-foreground-muted shrink-0" />
            <input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Хайх..."
              className="flex-1 bg-transparent text-foreground text-sm placeholder:text-foreground-muted outline-none"
            />
            {localQ && (
              <button type="button" onClick={() => { setLocalQ(''); router.push('/search'); }} className="text-foreground-muted hover:text-foreground">
                <X size={14} />
              </button>
            )}
            <button type="submit" className="shrink-0 px-4 py-1.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors">
              Хайх
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Results header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            {query ? (
              <p className="text-sm text-foreground-muted">
                <span className="text-foreground font-semibold">"{query}"</span>{' '}
                <span data-testid="results-count">{loading ? 'хайж байна...' : `— ${total} бараа олдлоо`}</span>
              </p>
            ) : (
              <p className="text-sm text-foreground-muted">Хайлтын үр дүн</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--glass-border)] text-sm font-semibold text-foreground hover:bg-white/5 transition-colors"
            >
              <SlidersHorizontal size={14} />
              Шүүлтүүр
              {filterCount > 0 && <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] flex items-center justify-center">{filterCount}</span>}
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-[var(--glass-border)] bg-surface text-sm text-foreground focus:outline-none cursor-pointer"
              >
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-foreground">Шүүлтүүр</h2>
                {filterCount > 0 && (
                  <button onClick={clearAllFilters} className="text-xs text-brand hover:underline">
                    Цэвэрлэх
                  </button>
                )}
              </div>
              <FilterSidebar
                brands={brands} categories={filterCategories.length ? filterCategories : categories}
                categoryNames={categoryNames}
                activeCategory={activeCategory} activeBrand={activeBrand}
                inStockOnly={inStockOnly} priceMin={priceMin} priceMax={priceMax}
                onChange={handleFilterChange}
              />
            </div>
          </aside>

          {/* Mobile filter drawer */}
          <AnimatePresence>
            {showFilters && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 lg:hidden"
                onClick={() => setShowFilters(false)}
              >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <m.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.25 }}
                  className="absolute left-0 top-0 bottom-0 w-80 bg-card border-r border-[var(--glass-border)] p-5 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-foreground">Шүүлтүүр</h2>
                    <button onClick={() => setShowFilters(false)} className="text-foreground-muted hover:text-foreground">
                      <X size={18} />
                    </button>
                  </div>
                  <FilterSidebar
                    brands={brands} categories={filterCategories.length ? filterCategories : categories}
                    categoryNames={categoryNames}
                    activeCategory={activeCategory} activeBrand={activeBrand}
                    inStockOnly={inStockOnly} priceMin={priceMin} priceMax={priceMax}
                    onChange={handleFilterChange}
                  />
                </m.div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <Skeleton />
            ) : hits.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {hits.map((hit, i) => (
                  <ProductCard key={hit.objectID} product={hitToCard(hit)} index={i} />
                ))}
              </div>
            ) : query ? (
              <div data-testid="no-results" className="text-center py-20">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-xl font-bold text-foreground mb-2">Илэрц олдсонгүй</h2>
                <p className="text-foreground-muted text-sm mb-6">
                  "<span className="text-foreground">{query}</span>" хайлтад тохирох бараа олдсонгүй.
                </p>
                {filterCount > 0 && (
                  <button onClick={clearAllFilters} className="mb-4 px-5 py-2.5 rounded-xl border border-[var(--glass-border)] text-sm font-semibold text-foreground hover:bg-white/5 transition-colors">
                    Шүүлтүүр цэвэрлэх
                  </button>
                )}
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {['Багаж', 'Будаг', 'Өрөм', 'LED', 'Сантехник'].map((s) => (
                    <Link key={s} href={`/search?q=${s}`}
                      className="px-3 py-1.5 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground hover:border-brand/30 transition-colors">
                      {s}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-xl font-bold text-foreground mb-2">Юу хайж байна вэ?</h2>
                <p className="text-foreground-muted text-sm">Дээрх хайлтын талбарт бараагаа бичнэ үү</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
