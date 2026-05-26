'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWishlistStore } from '@/lib/wishlist-store';
import { useCartStore } from '@/lib/cart-store';

export default function WishlistPage() {
  const { items, removeItem } = useWishlistStore();
  const { addItem } = useCartStore();
  const [hydrated, setHydrated] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => setHydrated(true), []);

  const handleAddToCart = (item: (typeof items)[0]) => {
    addItem({
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      slug: item.slug,
      image: item.image,
      price: item.price,
      currencyCode: item.currencyCode,
      qty: 1,
      mode: 'delivery',
      storeId: null,
      sku: item.sku,
    });
    setAddedIds((prev) => new Set([...prev, item.variantId]));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Хадгалсан бараа</h1>
        {hydrated && <span className="text-sm text-foreground-muted">{items.length} бараа</span>}
      </div>

      {!hydrated && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl animate-pulse h-56" />
          ))}
        </div>
      )}

      {hydrated && items.length === 0 && (
        <div className="bg-card rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">❤️</p>
          <p className="text-foreground-muted font-medium">Хадгалсан бараа байхгүй</p>
          <p className="text-xs text-foreground-muted mt-1">
            Бүтээгдэхүүний хуудас дээрх зүрхний дүрс дарж хадгална уу
          </p>
          <Link
            href="/"
            className="mt-4 inline-block px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            Дэлгүүр хэсэх
          </Link>
        </div>
      )}

      {hydrated && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.variantId} className="bg-card rounded-2xl overflow-hidden group">
              {/* Image */}
              <Link href={`/product/${item.slug}`} className="block">
                <div className="aspect-square bg-surface overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                  )}
                </div>
              </Link>

              <div className="p-3">
                <Link
                  href={`/product/${item.slug}`}
                  className="block text-sm font-medium text-foreground line-clamp-2 hover:text-brand transition-colors mb-2"
                >
                  {item.name}
                </Link>

                <p className="text-base font-bold text-brand mb-3">
                  ₮{Math.round(item.price / 100).toLocaleString('mn-MN')}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      addedIds.has(item.variantId)
                        ? 'bg-success/10 text-success'
                        : 'bg-brand text-white hover:bg-brand-hover'
                    }`}
                  >
                    {addedIds.has(item.variantId) ? '✓ Нэмэгдлээ' : 'Сагсанд'}
                  </button>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="p-2 rounded-lg text-error hover:bg-error/10 hover:text-error transition-colors"
                    title="Устгах"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
