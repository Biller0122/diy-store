'use client';

import { useEffect, useRef, useState } from 'react';
import { ProductCard, type ProductCardData } from './ProductCard';

/**
 * Renders a product grid progressively: only `initial` cards mount first, and
 * more are appended (`step` at a time) as the user scrolls a sentinel into view.
 * Keeps the initial DOM/image-decode cost small so the page paints fast even
 * when a section has many (e.g. 100) products.
 */
export function LazyProductGrid({
  products,
  initial = 20,
  step = 10,
  className = 'reveal-stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4',
}: {
  products: ProductCardData[];
  initial?: number;
  step?: number;
  className?: string;
}) {
  const [count, setCount] = useState(() => Math.min(initial, products.length));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (count >= products.length) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setCount(products.length);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCount((current) => Math.min(products.length, current + step));
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, products.length, step]);

  return (
    <>
      <div className={className}>
        {products.slice(0, count).map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
      {count < products.length && (
        <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-6 text-xs text-foreground-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          Бараа уншиж байна… ({count}/{products.length})
        </div>
      )}
    </>
  );
}
