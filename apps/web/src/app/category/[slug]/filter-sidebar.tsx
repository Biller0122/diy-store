'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface FacetValueResult {
  count: number;
  facetValue: {
    id: string;
    name: string;
    facet: { id: string; name: string; code: string };
  };
}

const AVAILABILITY_OPTIONS = [
  { value: 'pickup', label: 'Дэлгүүрээс авах' },
  { value: 'delivery', label: 'Хүргэлттэй' },
];
const PROMO_OPTIONS = [
  { value: 'sale', label: 'Хямдралтай' },
  { value: 'free-shipping', label: 'Үнэгүй хүргэлт' },
];

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-[var(--glass-border)] py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
      >
        {title}
        <svg
          className={`h-4 w-4 text-foreground-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function CheckboxItem({
  label,
  checked,
  onChange,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground hover:text-brand">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-[var(--glass-border)] text-brand focus:ring-brand"
      />
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-foreground-muted">({count})</span>
      )}
    </label>
  );
}

function FilterContent({ facets }: { facets: FacetValueResult[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Parse current URL state
  const selectedFacets = new Set((params.get('facets') ?? '').split(',').filter(Boolean));
  const selectedAvailability = new Set((params.get('availability') ?? '').split(',').filter(Boolean));
  const selectedPromos = new Set((params.get('promo') ?? '').split(',').filter(Boolean));
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');

  // Keep price inputs in sync when URL changes
  useEffect(() => {
    setMinPrice(params.get('minPrice') ?? '');
    setMaxPrice(params.get('maxPrice') ?? '');
  }, [params]);

  function updateParam(key: string, values: Set<string>) {
    const next = new URLSearchParams(params.toString());
    const joined = Array.from(values).join(',');
    if (joined) next.set(key, joined);
    else next.delete(key);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  function toggleFacet(id: string, checked: boolean) {
    const next = new Set(selectedFacets);
    if (checked) next.add(id);
    else next.delete(id);
    updateParam('facets', next);
  }

  function toggleAvailability(val: string, checked: boolean) {
    const next = new Set(selectedAvailability);
    if (checked) next.add(val);
    else next.delete(val);
    updateParam('availability', next);
  }

  function togglePromo(val: string, checked: boolean) {
    const next = new Set(selectedPromos);
    if (checked) next.add(val);
    else next.delete(val);
    updateParam('promo', next);
  }

  function applyPrice() {
    const next = new URLSearchParams(params.toString());
    if (minPrice) next.set('minPrice', minPrice);
    else next.delete('minPrice');
    if (maxPrice) next.set('maxPrice', maxPrice);
    else next.delete('maxPrice');
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  const hasFilters =
    selectedFacets.size > 0 ||
    selectedAvailability.size > 0 ||
    selectedPromos.size > 0 ||
    params.get('minPrice') ||
    params.get('maxPrice');

  // Group dynamic facets by facet entity
  const facetGroups = facets.reduce<Record<string, { name: string; values: FacetValueResult[] }>>(
    (acc, fv) => {
      const { code, name } = fv.facetValue.facet;
      if (!acc[code]) acc[code] = { name, values: [] };
      acc[code].values.push(fv);
      return acc;
    },
    {},
  );

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Шүүлтүүр</h2>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-brand hover:underline">
            Цэвэрлэх
          </button>
        )}
      </div>

      {/* Price range */}
      <FilterSection title="Үнийн хязгаар">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Доод ₮"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full rounded-lg border border-[var(--glass-border)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <span className="text-foreground-muted">–</span>
          <input
            type="number"
            placeholder="Дээд ₮"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full rounded-lg border border-[var(--glass-border)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          onClick={applyPrice}
          className="mt-2 w-full rounded-lg bg-brand py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Хэрэглэх
        </button>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Авах арга">
        {AVAILABILITY_OPTIONS.map((o) => (
          <CheckboxItem
            key={o.value}
            label={o.label}
            checked={selectedAvailability.has(o.value)}
            onChange={(v) => toggleAvailability(o.value, v)}
          />
        ))}
      </FilterSection>

      {/* Promotions */}
      <FilterSection title="Урамшуулал">
        {PROMO_OPTIONS.map((o) => (
          <CheckboxItem
            key={o.value}
            label={o.label}
            checked={selectedPromos.has(o.value)}
            onChange={(v) => togglePromo(o.value, v)}
          />
        ))}
      </FilterSection>

      {/* Dynamic facets (e.g. Brand) from Vendure */}
      {Object.entries(facetGroups).map(([code, group]) => (
        <FilterSection key={code} title={group.name}>
          {group.values.map((fv) => (
            <CheckboxItem
              key={fv.facetValue.id}
              label={fv.facetValue.name}
              count={fv.count}
              checked={selectedFacets.has(fv.facetValue.id)}
              onChange={(v) => toggleFacet(fv.facetValue.id, v)}
            />
          ))}
        </FilterSection>
      ))}
    </div>
  );
}

export default function FilterSidebar({
  facets,
  drawerOpen,
  onDrawerClose,
}: {
  facets: FacetValueResult[];
  drawerOpen: boolean;
  onDrawerClose: () => void;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-gray-100">
          <FilterContent facets={facets} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onDrawerClose}
          />
          {/* Panel */}
          <aside className="relative ml-0 h-full w-72 overflow-y-auto bg-card p-5 shadow-2xl shadow-black/60">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-bold text-foreground">Шүүлтүүр</span>
              <button
                onClick={onDrawerClose}
                className="rounded-lg p-1 hover:bg-surface/50"
                aria-label="Хаах"
              >
                <svg className="h-5 w-5 text-foreground-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FilterContent facets={facets} />
          </aside>
        </div>
      )}
    </>
  );
}
