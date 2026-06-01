'use client';

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/ui-store';
import { vendureShopFetch } from '@/lib/vendure';
import { trackSearch } from '@/lib/analytics/ga4';

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

const ALGOLIA_APP_ID    = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const ALGOLIA_INDEX     = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? 'diy_products';

async function fetchResults(term: string): Promise<{ name: string; slug: string; price?: number; image?: string; category?: string }[]> {
  if (ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY) {
    const { algoliasearch } = await import('algoliasearch');
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    const result = await client.searchSingleIndex({
      indexName: ALGOLIA_INDEX,
      searchParams: { query: term, hitsPerPage: 6 },
    });
    return (result.hits as any[]).map((h) => ({ name: h.name, slug: h.slug, price: h.price, image: h.imageUrl, category: h.category }));
  }

  const data = await vendureShopFetch<{ search: { totalItems: number; items: any[] } }>(SEARCH_QUERY, { term });
  return (data.search?.items ?? []).map((item: any) => ({
    name:  item.productName,
    slug:  item.slug,
    price: item.priceWithTax?.value,
    image: item.productAsset?.preview,
  }));
}

export function SearchBar() {
  const router = useRouter();
  const { searchOpen, closeSearch } = useUIStore();
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState<{ name: string; slug: string; price?: number; image?: string; category?: string }[]>([]);
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

  if (!searchOpen) return null;

  const showX = focused || !!query;

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
          className="relative w-full md:max-w-2xl glass-strong md:rounded-2xl overflow-hidden shadow-2xl mx-0 md:mx-4"
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
          <div className="max-h-[calc(100dvh-160px)] md:max-h-[60vh] overflow-y-auto">

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
              <div className="p-3" data-testid="search-results">
                <p className="text-[10px] text-foreground-muted font-semibold uppercase tracking-wider mb-2 px-2">
                  Хайлтын үр дүн
                </p>
                {results.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/product/${item.slug}`}
                    onClick={() => { saveRecent(query); trackSearch(query, results.length); handleClose(); }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface overflow-hidden shrink-0">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-brand transition-colors truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {item.category && <span className="text-[10px] text-foreground-muted">{item.category}</span>}
                        {item.price && (
                          <p className="text-xs font-mono text-brand">
                            ₮{Math.round(item.price / 100).toLocaleString('mn-MN')}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-foreground-muted group-hover:text-brand transition-colors" />
                  </Link>
                ))}
                <button
                  onClick={handleSubmit}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--glass-border)] text-sm text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <Search size={13} />
                  "{query}" — бүх үр дүнг харах
                </button>
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
