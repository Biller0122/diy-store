'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import SortBar from './sort-bar';
import FilterSidebar, { FacetValueResult } from './filter-sidebar';
import Pagination from './pagination';
import { CategoryCard } from '@/components/ui/CategoryCard';

type Subcategory = {
  id: string;
  name: string;
  slug: string;
  customFields?: { icon: string | null };
  productVariants?: { totalItems: number };
};

interface Props {
  facets: FacetValueResult[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  subcategories?: Subcategory[];
  children: React.ReactNode;
}

export default function CategoryShell({
  facets,
  totalItems,
  currentPage,
  totalPages,
  subcategories = [],
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Sort bar (includes mobile filter button) */}
      <Suspense>
        <SortBar totalItems={totalItems} onFilterClick={() => setDrawerOpen(true)} />
      </Suspense>

      <div className="flex gap-6">
        {/* Filter sidebar — desktop + mobile drawer */}
        <Suspense>
          <FilterSidebar
            facets={facets}
            drawerOpen={drawerOpen}
            onDrawerClose={() => setDrawerOpen(false)}
          />
        </Suspense>

        {/* Products + pagination */}
        <div className="min-w-0 flex-1">
          {subcategories.length > 0 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-foreground">Дэд ангилал</h2>
                <span className="text-xs text-foreground-muted">{subcategories.length} ангилал</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {subcategories.map((category, index) => (
                  <CategoryCard
                    key={category.id}
                    name={category.name}
                    slug={category.slug}
                    icon={category.customFields?.icon ?? '📦'}
                    productCount={category.productVariants?.totalItems ?? 0}
                    index={index}
                  />
                ))}
              </div>
            </section>
          )}
          {children}
          <Suspense>
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
