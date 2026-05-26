import Image from 'next/image';
import Link from 'next/link';

export interface SearchProduct {
  productId: string;
  productName: string;
  slug: string;
  productAsset: { preview: string } | null;
  priceWithTax:
    | { __typename: 'PriceRange'; min: number; max: number }
    | { __typename: 'SinglePrice'; value: number };
  currencyCode: string;
  inStock: boolean;
}

type Badge = 'sale' | 'new' | 'order' | null;

const BADGE_LABEL: Record<NonNullable<Badge>, string> = {
  sale: 'Хямдрал',
  new: 'Шинэ',
  order: 'Захиалгаар',
};
const BADGE_CLASS: Record<NonNullable<Badge>, string> = {
  sale: 'bg-error text-white',
  new: 'bg-success text-white',
  order: 'bg-info text-white',
};

function formatMNT(minor: number) {
  return `₮${Math.round(minor / 100).toLocaleString('mn-MN')}`;
}

function getPrice(p: SearchProduct['priceWithTax']): string {
  if (p.__typename === 'SinglePrice') return formatMNT(p.value);
  if (p.min === p.max) return formatMNT(p.min);
  return `${formatMNT(p.min)} – ${formatMNT(p.max)}`;
}

function StarRating({ rating = 0 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} од`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'text-amber' : 'text-foreground-muted/30'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductCard({
  product,
  badge,
}: {
  product: SearchProduct;
  badge?: Badge;
}) {
  const resolvedBadge: Badge = badge ?? (!product.inStock ? 'order' : null);

  return (
    <article className="group relative flex flex-col rounded-2xl bg-card border border-[var(--glass-border)] transition hover:border-[var(--glass-border-hover)]">
      {resolvedBadge && (
        <span
          className={`absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_CLASS[resolvedBadge]}`}
        >
          {BADGE_LABEL[resolvedBadge]}
        </span>
      )}

      <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-t-2xl bg-surface">
        {product.productAsset ? (
          <Image
            src={`${product.productAsset.preview}?preset=medium`}
            alt={product.productName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-foreground-muted/30">
            📦
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-sm font-medium text-foreground hover:text-brand"
        >
          {product.productName}
        </Link>

        <StarRating rating={0} />

        <p className="text-base font-bold text-foreground">
          {getPrice(product.priceWithTax)}
        </p>

        <button
          type="button"
          disabled={!product.inStock}
          className="mt-auto w-full rounded-xl bg-brand py-2 text-sm font-semibold text-white transition hover:bg-brand-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-surface disabled:text-foreground-muted"
        >
          {product.inStock ? 'Сагсанд нэмэх' : 'Захиалгаар'}
        </button>
      </div>
    </article>
  );
}
