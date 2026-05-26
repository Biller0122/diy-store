'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import SortBar from './sort-bar';
import FilterSidebar, { FacetValueResult } from './filter-sidebar';
import Pagination from './pagination';

interface Props {
  facets: FacetValueResult[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  children: React.ReactNode;
}

export default function CategoryShell({
  facets,
  totalItems,
  currentPage,
  totalPages,
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
          {children}
          <Suspense>
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
