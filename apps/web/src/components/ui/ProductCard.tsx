'use client';

import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Heart, Star, Zap } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import { useWishlistStore } from '@/lib/wishlist-store';
import { useUIStore } from '@/lib/ui-store';
import { cn, fmt } from '@/lib/utils';
import { trackAddToCart, trackViewItem } from '@/lib/analytics/ga4';

export interface ProductCardData {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  currencyCode?: string;
  rating?: number;
  reviewCount?: number;
  badge?: 'ШИНЭ' | 'ХЯМДРАЛ' | 'ТОП' | 'ДУУССАН';
  inStock?: boolean;
  sku?: string;
  supplierId?: string;
  supplierName?: string;
  supplierSlug?: string;
  supplierDistrict?: string;
  supplierLat?: number;
  supplierLng?: number;
}

interface ProductCardProps {
  product: ProductCardData;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, hasItem } = useWishlistStore();
  const { addToast, openCart } = useUIStore();
  const wishlisted = hasItem(product.variantId);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);

  // Track view_item once card enters viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewTracked.current) {
          viewTracked.current = true;
          trackViewItem({ id: product.id, variantId: product.variantId, name: product.name, price: product.price });
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [product.id, product.variantId, product.name, product.price]);

  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    addItem({
      productId: product.id,
      variantId: product.variantId,
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: product.price,
      currencyCode: product.currencyCode ?? 'MNT',
      qty: 1,
      mode: 'delivery',
      storeId: null,
      sku: product.sku ?? '',
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      supplierSlug: product.supplierSlug,
      supplierDistrict: product.supplierDistrict,
      supplierLat: product.supplierLat,
      supplierLng: product.supplierLng,
    });
    trackAddToCart({ id: product.id, variantId: product.variantId, name: product.name, price: product.price, qty: 1 });
    addToast({ type: 'success', title: 'Сагсанд нэмлээ', message: product.name });
    openCart();
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlisted) {
      removeFromWishlist(product.variantId);
      addToast({ type: 'info', title: 'Хадгалсанаас хаслаа' });
    } else {
      addToWishlist({
        productId: product.id,
        variantId: product.variantId,
        name: product.name,
        slug: product.slug,
        image: product.image,
        price: product.price,
        currencyCode: product.currencyCode ?? 'MNT',
        sku: product.sku ?? '',
      });
      addToast({ type: 'success', title: 'Хадгалсанд нэмлээ' });
    }
  };

  const BADGE_STYLES: Record<string, string> = {
    'ШИНЭ':    'bg-info text-white',
    'ХЯМДРАЛ': 'bg-brand text-white',
    'ТОП':     'bg-amber text-dark',
    'ДУУССАН': 'bg-muted/50 text-foreground-muted',
  };

  return (
    <m.div
      ref={cardRef}
      data-testid="product-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative rounded-2xl overflow-hidden bg-card border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all duration-300 hover:shadow-xl hover:shadow-black/40 flex flex-col"
    >
      <Link href={`/product/${product.slug}`} className="flex flex-col flex-1">
        {/* Image */}
        <div className="relative overflow-hidden aspect-square bg-surface">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />

          {/* Top badges row */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            {product.badge && (
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md', BADGE_STYLES[product.badge])}>
                {product.badge}
              </span>
            )}
            {discountPct && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand text-white ml-auto">
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <button
            data-testid="wishlist-btn"
            onClick={handleWishlist}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full glass flex items-center justify-center transition-all duration-200',
              wishlisted ? 'text-red-500' : 'text-foreground-muted hover:text-red-400',
              product.badge && !discountPct ? 'top-3' : 'top-10',
              'top-3 right-3',
            )}
            aria-label="Хадгалах"
          >
            <Heart size={14} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>

          {/* Stock status bottom */}
          <div className="absolute bottom-3 left-3">
            <span className={cn(
              'flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full glass',
              product.inStock !== false ? 'text-success' : 'text-error',
            )}>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                product.inStock !== false ? 'bg-success animate-pulse' : 'bg-error',
              )} />
              {product.inStock !== false ? 'Бэлэн' : 'Дууссан'}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-2 flex-1">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-brand transition-colors">
            {product.name}
          </h3>

          {/* Stars */}
          {(product.rating !== undefined) && (
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={10}
                    className={i < Math.round(product.rating!) ? 'text-amber fill-amber' : 'text-border'}
                    fill={i < Math.round(product.rating!) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              {product.reviewCount !== undefined && (
                <span className="text-[10px] text-foreground-muted">({product.reviewCount})</span>
              )}
            </div>
          )}

          {/* Price row */}
          <div className="flex items-end gap-2 mt-auto">
            <span className="text-lg font-bold font-mono text-brand">
              {fmt(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-foreground-muted line-through font-mono">
                {fmt(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Add to cart — slides up on hover */}
      <div className="px-3 pb-3">
        <AnimatePresence>
          <m.button
            data-testid="add-to-cart-btn"
            onClick={handleAddToCart}
            disabled={product.inStock === false}
            animate={{ opacity: hovered ? 1 : 0.7, y: hovered ? 0 : 4 }}
            transition={{ duration: 0.18 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all',
              product.inStock !== false
                ? 'bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand/20'
                : 'bg-surface text-foreground-muted cursor-not-allowed',
            )}
          >
            <ShoppingCart size={13} />
            {product.inStock !== false ? 'Сагсанд нэмэх' : 'Дууссан'}
          </m.button>
        </AnimatePresence>
      </div>
    </m.div>
  );
}
