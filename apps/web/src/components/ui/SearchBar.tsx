'use client';

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/ui-store';
import { vendureShopFetch } from '@/lib/vendure';
import { useCartStore } from '@/lib/cart-store';
import { trackAddToCart, trackSearch } from '@/lib/analytics/ga4';
import { fmt } from '@/lib/utils';

const PLACEHOLDERS = [
  'Өрөм хайх...',
  'Будаг хайх...',
  'Багаж хайх...',
  'Цахилгаан хэрэгсэл хайх...',
  'Сантехник хайх...',
];

const POPULAR = [
  { name: 'Гар өрөм',       slug: 'gar-orem' },
  { name: 'Акриль будаг',   slug: 'acryl-paint' },
  { name: 'Тоос соруулагч', slug: 'vacuum' },
  { name: 'LED чийдэн',     slug: 'led' },
];

const SEARCH_QUERY = `
  query Search($term: String!) {
    search(input: { term: $term, take: 6, groupByProduct: true }) {
      totalItems
      items {
        productId productVariantId productName slug
        productAsset { preview }
        priceWithTax { ... on SinglePrice { value } }
        inStock
      }
    }
  }
`;

const SUPPLIER_PRODUCTS_QUERY = `
  query SupplierProducts {
    supplierProducts {
      items {
        id
        name
        slug
        image
        price
        category
        stock
        enabled
      }
    }
  }
`;

const PRODUCT_CATEGORIES_QUERY = `
  query ProductCategories {
    collections(options: { take: 100 }) {
      items { name slug }
    }
  }
`;

const ALGOLIA_APP_ID    = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const ALGOLIA_INDEX     = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? 'diy_products';

type SearchResult = {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  price?: number;
  image?: string;
  category?: string;
  inStock?: boolean;
};

type ResultGroup = {
  key: string;
  title: string;
  items: SearchResult[];
};

const TOKEN_LABELS: Record<string, string> = {
  cement: 'Цемент',
  tsement: 'Цемент',
  sement: 'Цемент',
  'цемент': 'Цемент',
  'цемэнт': 'Цемент',
  armatur: 'Арматур',
  armature: 'Арматур',
  rebar: 'Арматур',
  'арматур': 'Арматур',
  toosgo: 'Тоосго',
  tosgo: 'Тоосго',
  brick: 'Тоосго',
  'тоосго': 'Тоосго',
  barilga: 'Барилга',
  building: 'Барилга',
  material: 'Материал',
  materialuud: 'Материал',
  'барилга': 'Барилга',
  'материал': 'Материал',
  budag: 'Будаг',
  paint: 'Будаг',
  'будаг': 'Будаг',
  bagaj: 'Багаж',
  tool: 'Багаж',
  tools: 'Багаж',
  'багаж': 'Багаж',
};

const TOKEN_VARIANTS: Record<string, string[]> = {
  cement: ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  tsement: ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  sement: ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  'цемент': ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  'цемэнт': ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  armatur: ['armatur', 'armature', 'rebar', 'арматур'],
  armature: ['armatur', 'armature', 'rebar', 'арматур'],
  rebar: ['armatur', 'armature', 'rebar', 'арматур'],
  'арматур': ['armatur', 'armature', 'rebar', 'арматур'],
  toosgo: ['toosgo', 'tosgo', 'brick', 'тоосго'],
  tosgo: ['toosgo', 'tosgo', 'brick', 'тоосго'],
  brick: ['toosgo', 'tosgo', 'brick', 'тоосго'],
  'тоосго': ['toosgo', 'tosgo', 'brick', 'тоосго'],
};

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/ё/g, 'е');
}

function getSearchTokens(term: string) {
  return normalizeSearchText(term)
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function getTokenVariants(token: string) {
  return TOKEN_VARIANTS[token] ?? [token];
}

function getCanonicalToken(token: string) {
  const variants = getTokenVariants(token);
  return variants.find((variant) => TOKEN_LABELS[variant]) ?? token;
}

function matchesSearch(term: string, values: Array<string | null | undefined>) {
  const normalized = normalizeSearchText(term.trim());
  const tokens = getSearchTokens(term);
  const variants = tokens.flatMap(getTokenVariants);
  const haystack = normalizeSearchText(values.filter(Boolean).join(' '));

  if (!normalized) return true;
  if (haystack.includes(normalized)) return true;
  return variants.some((variant) => haystack.includes(variant));
}

function tokenLabel(token: string) {
  const normalized = getCanonicalToken(normalizeSearchText(token));
  return TOKEN_LABELS[normalized] ?? normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function groupResults(results: SearchResult[], query: string): ResultGroup[] {
  const tokens = getSearchTokens(query);
  const canonicalTokens = tokens.map(getCanonicalToken);
  const groups = new Map<string, ResultGroup>();

  for (const item of results) {
    const haystack = normalizeSearchText([item.name, item.slug, item.category].filter(Boolean).join(' '));
    const matchedToken = tokens.find((token) =>
      getTokenVariants(token).some((variant) => haystack.includes(variant)),
    );
    const key = matchedToken ? getCanonicalToken(matchedToken) : item.category ?? 'Бусад';
    const title = matchedToken ? tokenLabel(matchedToken) : key;
    const group = groups.get(key) ?? { key, title, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aIndex = canonicalTokens.indexOf(a.key);
    const bIndex = canonicalTokens.indexOf(b.key);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return b.items.length - a.items.length;
  });
}

async function fetchResults(term: string): Promise<SearchResult[]> {
  const supplierResults = async () => {
    const [data, categories] = await Promise.all([
      vendureShopFetch<{ supplierProducts: { items: Array<{
      id: string;
      name: string;
      slug: string;
      image?: string | null;
      price: number;
      category?: string | null;
      stock: number;
      enabled: boolean;
      }> } }>(SUPPLIER_PRODUCTS_QUERY, undefined, { revalidate: 0 }),
      vendureShopFetch<{ collections: { items: Array<{ name: string; slug: string }> } }>(PRODUCT_CATEGORIES_QUERY, undefined, { revalidate: 0 }).catch(() => ({ collections: { items: [] } })),
    ]);
    const categoryNames = new Map(categories.collections.items.map((category) => [category.slug, category.name]));
    return data.supplierProducts.items
      .filter((item) => item.enabled && item.stock > 0)
      .filter((item) => matchesSearch(term, [
        item.name,
        item.slug,
        item.category,
        categoryNames.get(item.category ?? ''),
      ]))
      .slice(0, 6)
      .map((item) => ({
        id: `supplier-${item.id}`,
        variantId: `supplier-${item.id}`,
        name: item.name,
        slug: item.slug,
        price: item.price,
        image: item.image ?? undefined,
        inStock: item.stock > 0,
        category: categoryNames.get(item.category ?? '') ?? item.category ?? 'Нийлүүлэгч',
      }));
  };

  if (ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY) {
    const { algoliasearch } = await import('algoliasearch');
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    const result = await client.searchSingleIndex({
      indexName: ALGOLIA_INDEX,
      searchParams: { query: term, hitsPerPage: 6 },
    });
    const algoliaResults = (result.hits as any[]).map((h) => ({
      id: String(h.objectID ?? h.id ?? h.slug),
      variantId: String(h.variantId ?? h.objectID ?? h.id ?? h.slug),
      name: h.name,
      slug: h.slug,
      price: h.price,
      image: h.imageUrl,
      category: h.category,
      inStock: h.inStock,
    }));
    const supplier = await supplierResults().catch(() => []);
    return [...supplier, ...algoliaResults].slice(0, 6);
  }

  const data = await vendureShopFetch<{ search: { totalItems: number; items: any[] } }>(SEARCH_QUERY, { term });
  const catalogResults = (data.search?.items ?? []).map((item: any) => ({
    id: item.productId,
    variantId: item.productVariantId,
    name:  item.productName,
    slug:  item.slug,
    price: item.priceWithTax?.value,
    image: item.productAsset?.preview,
    inStock: item.inStock,
  }));
  const supplier = await supplierResults().catch(() => []);
  return [...supplier, ...catalogResults].slice(0, 6);
}

export function SearchBar() {
  const router = useRouter();
  const { searchOpen, closeSearch, addToast, openCart } = useUIStore();
  const { addItem } = useCartStore();
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState<SearchResult[]>([]);
  const [loading, setLoading]           = useState(false);
  const [focused, setFocused]           = useState(false);
  const [recent, setRecent]             = useState<string[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setFocused(false);
    inputRef.current?.blur();
    closeSearch();
  };

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('diy-recent-searches') ?? '[]');
      setRecent(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => { inputRef.current?.focus(); setFocused(true); }, 100);
    } else {
      setQuery('');
      setResults([]);
      setFocused(false);
    }
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchOpen) handleClose();
        else useUIStore.getState().openSearch();
      }
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen, closeSearch]);

  const handleInput = (val: string) => {
    setQuery(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!val.trim()) { setResults([]); return; }

    searchRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await fetchResults(val);
        setResults(items);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }, 300);
  };

  const saveRecent = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recent.filter((r) => r !== term)].slice(0, 5);
    setRecent(updated);
    try { localStorage.setItem('diy-recent-searches', JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    saveRecent(query.trim());
    trackSearch(query.trim());
    handleClose();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleAddToCart = (item: SearchResult) => {
    if (item.inStock === false || !item.price) return;
    addItem({
      productId: item.id,
      variantId: item.variantId,
      name: item.name,
      slug: item.slug,
      image: item.image ?? null,
      price: item.price,
      currencyCode: 'MNT',
      qty: 1,
      mode: 'delivery',
      storeId: null,
      sku: '',
      supplierId: item.id.startsWith('supplier-') ? item.id : undefined,
      supplierName: item.id.startsWith('supplier-') ? 'Нийлүүлэгч' : undefined,
    });
    trackAddToCart({ id: item.id, variantId: item.variantId, name: item.name, price: item.price, qty: 1 });
    addToast({ type: 'success', title: 'Сагсанд нэмлээ', message: item.name });
    openCart();
  };

  if (!searchOpen) return null;

  const showX = focused || !!query;
  const queryTokens = getSearchTokens(query);
  const resultGroups = groupResults(results, query);

  return (
    <AnimatePresence>
      {/* Overlay container — stops above bottom nav on mobile so it stays tappable */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-x-0 top-0 bottom-16 md:inset-0 z-[200] flex items-start justify-center pt-4 md:pt-20 px-0 md:px-4"
        data-testid="search-dropdown"
      >
        {/* Backdrop — clicking closes search */}
        <div
          className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Search panel */}
        <m.div
          initial={{ opacity: 0, scale: 0.98, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full md:max-w-5xl glass-strong md:rounded-2xl overflow-hidden shadow-2xl mx-0 md:mx-4"
        >
          {/* Input row */}
          <div className="flex items-center gap-2 px-3 md:px-4 py-3 md:py-4 border-b border-[var(--glass-border)]">

            {/* Mobile back button */}
            <button
              onClick={handleClose}
              className="md:hidden flex-shrink-0 p-1.5 -ml-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/10 transition-colors"
              aria-label="Буцах"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Search icon — desktop only */}
            <Search size={18} className="hidden md:block text-foreground-muted shrink-0" />

            <input
              data-testid="search-input"
              ref={inputRef}
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder={PLACEHOLDERS[placeholderIdx]}
              className="flex-1 bg-transparent text-foreground placeholder:text-foreground-muted text-sm outline-none min-w-0"
            />

            <div className="flex items-center gap-2 shrink-0">
              {/* X button — clears text and closes on mobile, only clears on desktop when has text */}
              {showX && (
                <button
                  data-testid="search-clear"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur before click fires
                    handleClose();
                  }}
                  className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-foreground-muted hover:text-foreground"
                  aria-label="Хаах"
                >
                  <X size={14} />
                </button>
              )}
              <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-foreground-muted border border-[var(--glass-border)] rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[calc(100dvh-120px)] md:max-h-[75vh] overflow-y-auto">

            {loading && (
              <div className="p-3 space-y-2">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-surface shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-surface rounded w-3/4" />
                      <div className="h-3 bg-surface rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-5 p-4 md:p-5" data-testid="search-results">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl bg-surface px-4 py-2 text-sm font-semibold text-foreground break-words">
                    {query}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Сайн байна уу. Таны хайлтад тохирох бараануудыг ангиллаар нь харууллаа.
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {resultGroups.map((group) => group.title).join(', ')} хэсгээс шууд сагсанд нэмэх боломжтой.
                  </p>
                  {queryTokens.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {queryTokens.slice(0, 6).map((token) => (
                        <span
                          key={token}
                          className="rounded-full border border-[var(--glass-border)] bg-surface px-2.5 py-1 text-[10px] text-foreground-muted"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {resultGroups.map((group) => (
                  <section key={group.key} className="space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{group.title}</h3>
                      <p className="text-xs text-foreground-muted">{group.items.length} бараа</p>
                    </div>

                    <div className="-mx-2 overflow-x-auto px-2 pb-2">
                      <div className="grid auto-cols-[minmax(154px,174px)] grid-flow-col gap-3">
                        {group.items.map((item) => (
                          <div
                            key={item.slug}
                            className="rounded-xl border border-[var(--glass-border)] bg-card overflow-hidden"
                          >
                            <Link
                              href={`/product/${item.slug}`}
                              onClick={() => { saveRecent(query); trackSearch(query, results.length); handleClose(); }}
                              className="block"
                            >
                              <div className="aspect-square bg-surface overflow-hidden">
                                {item.image
                                  ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                  : <div className="flex h-full w-full items-center justify-center text-3xl">📦</div>}
                              </div>
                              <div className="min-h-[82px] p-2.5">
                                <p className="font-mono text-sm font-bold text-foreground">
                                  {item.price ? fmt(item.price) : 'Үнэ лавлах'}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-foreground">
                                  {item.name}
                                </p>
                                <p className="mt-1 text-[10px] text-foreground-muted line-clamp-1">
                                  {item.category ?? 'Бараа'} · {item.inStock === false ? 'Дууссан' : 'Бэлэн'}
                                </p>
                              </div>
                            </Link>
                            <div className="px-2.5 pb-2.5">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleAddToCart(item);
                                }}
                                disabled={item.inStock === false || !item.price}
                                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-brand text-[11px] font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-surface disabled:text-foreground-muted"
                              >
                                <ShoppingCart size={12} />
                                Сагсанд
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="p-8 text-center" data-testid="no-results">
                <p className="text-foreground-muted text-sm mb-3">"{query}" илэрц олдсонгүй</p>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground hover:bg-white/5 transition-colors"
                >
                  Бүтэн хайлт хийх →
                </button>
              </div>
            )}

            {!query && (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recent.length > 0 && (
                  <div data-testid="recent-searches">
                    <p className="text-[10px] text-foreground-muted font-semibold uppercase tracking-wider mb-2 px-2">
                      Сүүлийн хайлт
                    </p>
                    {recent.map((r) => (
                      <button
                        key={r}
                        onClick={() => handleInput(r)}
                        className="flex items-center gap-2 w-full p-2 rounded-xl hover:bg-white/5 transition-colors text-left"
                      >
                        <Clock size={13} className="text-foreground-muted" />
                        <span className="text-sm text-foreground">{r}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-foreground-muted font-semibold uppercase tracking-wider mb-2 px-2">
                    Алдартай хайлт
                  </p>
                  {POPULAR.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/search?q=${p.name}`}
                      onClick={handleClose}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <TrendingUp size={13} className="text-brand" />
                      <span className="text-sm text-foreground">{p.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer shortcuts — desktop only */}
          <div className="hidden md:flex border-t border-[var(--glass-border)] px-4 py-2 items-center gap-4 text-[10px] text-foreground-muted">
            <span className="flex items-center gap-1">
              <kbd className="border border-[var(--glass-border)] rounded px-1">Enter</kbd> Хайх
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-[var(--glass-border)] rounded px-1">Esc</kbd> Хаах
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-[var(--glass-border)] rounded px-1">Ctrl K</kbd> Нээх/хаах
            </span>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
