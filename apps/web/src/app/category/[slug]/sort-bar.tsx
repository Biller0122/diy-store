'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const SORT_OPTIONS = [
  { value: '', label: 'Хамааралтай' },
  { value: 'price-asc', label: 'Үнэ өсөх' },
  { value: 'price-desc', label: 'Үнэ буурах' },
  { value: 'new', label: 'Шинэ' },
  { value: 'rating', label: 'Үнэлгээ' },
];

export default function SortBar({
  totalItems,
  onFilterClick,
}: {
  totalItems: number;
  onFilterClick: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const currentSort = params.get('sort') ?? '';

  function handleSort(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set('sort', value);
    else next.delete('sort');
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-card border border-[var(--glass-border)] px-4 py-3">
      {/* Mobile filter button */}
      <button
        type="button"
        onClick={onFilterClick}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-white/5 md:hidden transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M9 16h6" />
        </svg>
        Шүүлтүүр
      </button>

      {/* Result count */}
      <p className="text-sm text-foreground-muted">
        <span className="font-semibold text-foreground">{totalItems.toLocaleString('mn-MN')}</span> бүтээгдэхүүн
      </p>

      {/* Sort dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="hidden text-sm text-foreground-muted sm:block">Эрэмбэлэх:</label>
        <select
          id="sort"
          value={currentSort}
          onChange={(e) => handleSort(e.target.value)}
          className="rounded-lg border border-[var(--glass-border)] bg-card py-1.5 pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
