'use client';

import { useState } from 'react';
import { Search, Plus, Edit3, Trash2, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSupplierStore } from '@/lib/supplier-store';
import { MOCK_SUPPLIER_PRODUCTS } from '@/lib/supplier-data';

const STATUS_CLS: Record<string, string> = {
  true: 'bg-success/15 text-success',
  false: 'bg-foreground-muted/15 text-foreground-muted',
};

export default function SupplierProductsPage() {
  const { supplier } = useSupplierStore();
  const [search, setSearch] = useState('');

  const rawProducts = supplier?.slug ? (MOCK_SUPPLIER_PRODUCTS[supplier.slug] ?? []) : [];
  const allProducts = rawProducts.length > 0 ? rawProducts : [
    { id: 'p1', variantId: 'v1', name: 'Dulux EasyCare 4L Цагаан', slug: 'dulux-white', image: '', price: 5990000, rating: 4.8, reviewCount: 124, badge: 'ТОП', inStock: true },
    { id: 'p2', variantId: 'v2', name: 'Caparol Indeko 10L', slug: 'caparol-10l', image: '', price: 18990000, originalPrice: 22990000, rating: 4.6, reviewCount: 89, badge: 'ХЯМДРАЛ', inStock: true },
    { id: 'p3', variantId: 'v3', name: 'Knauf Праймер 25кг', slug: 'knauf-primer', image: '', price: 3990000, rating: 4.5, reviewCount: 67, inStock: true },
    { id: 'p4', variantId: 'v4', name: 'Sadolin Extra 1L', slug: 'sadolin-1l', image: '', price: 2490000, rating: 4.3, reviewCount: 28, inStock: false },
    { id: 'p5', variantId: 'v5', name: 'Marshall Будаг 2.5L', slug: 'marshall-25', image: '', price: 4990000, rating: 4.4, reviewCount: 33, inStock: true },
  ];

  const filtered = allProducts.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Миний бараа</h2>
          <p className="text-sm text-foreground-muted mt-0.5">{allProducts.length} нийт бараа</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-hover transition-colors shadow-lg shadow-brand/20">
          <Plus size={16} /> Бараа нэмэх
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Бараа хайх..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-[var(--glass-border)] text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-[var(--glass-border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--glass-border)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">Бараа</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted uppercase tracking-wider">Үнэ</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-foreground-muted uppercase tracking-wider">Нөөц</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-foreground-muted uppercase tracking-wider">Үнэлгээ</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-foreground-muted uppercase tracking-wider">Байдал</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted uppercase tracking-wider">Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, i) => (
                <tr key={product.id} className={`border-b border-[var(--glass-border)] hover:bg-white/2 transition-colors ${i === filtered.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Package size={16} className="text-foreground-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[180px]">{product.name}</p>
                        <p className="text-[10px] text-foreground-muted">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-xs font-bold text-brand">₮{Math.round(product.price / 100).toLocaleString()}</p>
                    {product.originalPrice && (
                      <p className="text-[10px] text-foreground-muted line-through">₮{Math.round(product.originalPrice / 100).toLocaleString()}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${product.inStock ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
                      {product.inStock ? 'Бэлэн' : 'Дууссан'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-amber text-xs">★</span>
                      <span className="text-xs text-foreground">{product.rating}</span>
                      <span className="text-[10px] text-foreground-muted">({product.reviewCount})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-foreground-muted hover:text-foreground transition-colors">
                      {product.inStock ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className="p-1.5 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-foreground transition-colors">
                        <Edit3 size={13} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-error/10 text-foreground-muted hover:text-error transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Package size={32} className="mx-auto text-foreground-muted mb-3" />
            <p className="text-sm text-foreground-muted">Бараа олдсонгүй</p>
          </div>
        )}
      </div>
    </div>
  );
}
