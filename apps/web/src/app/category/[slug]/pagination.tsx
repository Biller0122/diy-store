'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function pageHref(pathname: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params.toString());
  if (page === 1) next.delete('page');
  else next.set('page', String(page));
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function PageButton({
  href,
  active,
  disabled,
  children,
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm text-foreground-muted">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition ${
        active
          ? 'bg-brand text-white shadow-sm'
          : 'text-foreground-muted hover:bg-dark'
      }`}
    >
      {children}
    </Link>
  );
}

export default function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalPages <= 1) return null;

  // Build visible page numbers: always show first, last, current ±1
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let p = Math.max(1, currentPage - 1); p <= Math.min(totalPages, currentPage + 1); p++) {
    pages.add(p);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);

  const items: Array<number | 'ellipsis'> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push('ellipsis');
    items.push(p);
  });

  return (
    <nav aria-label="Хуудаслалт" className="mt-8 flex items-center justify-center gap-1">
      <PageButton
        href={pageHref(pathname, params, currentPage - 1)}
        disabled={currentPage <= 1}
      >
        ←
      </PageButton>

      {items.map((item, i) =>
        item === 'ellipsis' ? (
          <span key={`e-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-foreground-muted">
            …
          </span>
        ) : (
          <PageButton
            key={item}
            href={pageHref(pathname, params, item)}
            active={item === currentPage}
          >
            {item}
          </PageButton>
        ),
      )}

      <PageButton
        href={pageHref(pathname, params, currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        →
      </PageButton>
    </nav>
  );
}
