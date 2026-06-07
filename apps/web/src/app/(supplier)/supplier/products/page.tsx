'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit3, Trash2, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import { BulkProductGrid } from '@/components/supplier/bulk-products/BulkProductGrid';
import { useSupplierStore } from '@/lib/supplier-store';
import { vendureShopFetch } from '@/lib/vendure';
import {
  buildCategoryGroups,
  getCategoryDisplayName,
  isRootCollection,
  type ProductCategoryOption,
} from '@/lib/category-options';

type SupplierProduct = {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  category?: string | null;
  description?: string | null;
  rating: number;
  reviewCount: number;
  badge?: string;
  inStock: boolean;
  stock: number;
  enabled: boolean;
};

const SUPPLIER_PRODUCTS_QUERY = `
  query SupplierProducts($supplierId: String) {
    supplierProducts(supplierId: $supplierId) {
      items {
        id
        name
        slug
        image
        price
        originalPrice
        category
        description
        stock
        enabled
      }
      total
    }
  }
`;

const UPDATE_SUPPLIER_PRODUCT_MUTATION = `
  mutation UpdateSupplierProduct($id: ID!, $input: SupplierProductUpdateInput!) {
    updateSupplierProduct(id: $id, input: $input) {
      id
      name
      slug
      image
      price
      originalPrice
      category
      description
      stock
      enabled
    }
  }
`;

const DELETE_SUPPLIER_PRODUCT_MUTATION = `
  mutation DeleteSupplierProduct($id: ID!) {
    deleteSupplierProduct(id: $id)
  }
`;

const PRODUCT_CATEGORIES_QUERY = `
  query ProductCategories {
    collections(options: { take: 100, sort: { position: ASC } }) {
      items {
        id
        name
        slug
        parentId
        parent { id name slug }
      }
    }
  }
`;

function toFormPrice(value: number) {
  return String(Math.round(value / 100));
}

function toMinorUnits(value: string) {
  return Math.round(Number(value.replace(/[^\d]/g, '')) * 100);
}

export default function SupplierProductsPage() {
  const { supplier } = useSupplierStore();
  const [search, setSearch] = useState('');
  const [serverProducts, setServerProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [editing, setEditing] = useState<SupplierProduct | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
    description: '',
    enabled: true,
  });
  const supplierId = supplier?.id;
  const categoryNameBySlug = useMemo(() => {
    return new Map(categories.map((category) => [category.slug, getCategoryDisplayName(category)]));
  }, [categories]);
  const categoryGroups = useMemo(() => buildCategoryGroups(categories), [categories]);
  const localProducts = useMemo<SupplierProduct[]>(() => {
    if (typeof window === 'undefined' || !supplierId) return [];
    try {
      const stored = localStorage.getItem(`diy-supplier-products:${supplierId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [supplierId]);

  function mapProduct(product: SupplierProduct & { enabled: boolean; stock: number }): SupplierProduct {
    return {
      ...product,
      variantId: product.id,
      rating: 0,
      reviewCount: 0,
      inStock: product.enabled && product.stock > 0,
      stock: product.stock,
      enabled: product.enabled,
    };
  }

  async function loadProducts() {
    if (!supplierId) {
      setServerProducts([]);
      setServerLoaded(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await vendureShopFetch<{ supplierProducts: { items: Array<SupplierProduct & { enabled: boolean; stock: number }> } }>(
        SUPPLIER_PRODUCTS_QUERY,
        { supplierId },
      );
      setServerProducts(data.supplierProducts.items.map(mapProduct));
      setServerLoaded(true);
      setSyncError('');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Бараа татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    if (!supplierId) {
      setServerProducts([]);
      setServerLoaded(false);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    setLoading(true);
    vendureShopFetch<{ supplierProducts: { items: Array<SupplierProduct & { enabled: boolean; stock: number }> } }>(
      SUPPLIER_PRODUCTS_QUERY,
      { supplierId },
    )
      .then((data) => {
        if (!mounted) return;
        setServerProducts(data.supplierProducts.items.map(mapProduct));
        setServerLoaded(true);
        setSyncError('');
      })
      .catch((err) => {
        if (mounted) setSyncError(err instanceof Error ? err.message : 'Бараа татахад алдаа гарлаа');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [supplierId]);

  useEffect(() => {
    let mounted = true;
    vendureShopFetch<{ collections: { items: ProductCategoryOption[] } }>(
      PRODUCT_CATEGORIES_QUERY,
      undefined,
      { revalidate: 0 },
    )
      .then((data) => {
        if (!mounted) return;
        setCategories(data.collections.items.filter((item) => !isRootCollection(item)));
      })
      .catch(() => {
        if (mounted) setCategories([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const allProducts = serverLoaded
    ? [
        ...localProducts.filter((local) => !serverProducts.some((server) => server.slug === local.slug)),
        ...serverProducts,
      ]
    : localProducts;

  const filtered = allProducts.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(product: SupplierProduct) {
    setEditing(product);
    setEditForm({
      name: product.name,
      price: toFormPrice(product.price),
      stock: String(product.stock),
      category: product.category ?? '',
      description: product.description ?? '',
      enabled: product.enabled,
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingId(editing.id);
    try {
      await vendureShopFetch(UPDATE_SUPPLIER_PRODUCT_MUTATION, {
        id: editing.id,
        input: {
          name: editForm.name.trim(),
          price: toMinorUnits(editForm.price),
          stock: Math.max(0, Number(editForm.stock) || 0),
          category: editForm.category.trim(),
          description: editForm.description.trim(),
          enabled: editForm.enabled,
        },
      });
      setEditing(null);
      await loadProducts();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Бараа засахад алдаа гарлаа');
    } finally {
      setSavingId('');
    }
  }

  async function toggleEnabled(product: SupplierProduct) {
    setSavingId(product.id);
    try {
      await vendureShopFetch(UPDATE_SUPPLIER_PRODUCT_MUTATION, {
        id: product.id,
        input: { enabled: !product.enabled },
      });
      await loadProducts();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Төлөв солиход алдаа гарлаа');
    } finally {
      setSavingId('');
    }
  }

  async function deleteProduct(product: SupplierProduct) {
    if (!window.confirm(`${product.name} барааг устгах уу?`)) return;
    setSavingId(product.id);
    try {
      await vendureShopFetch(DELETE_SUPPLIER_PRODUCT_MUTATION, { id: product.id });
      try {
        localStorage.removeItem(`diy-supplier-products:${supplierId}`);
      } catch {
        // ignore local cleanup
      }
      await loadProducts();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Бараа устгахад алдаа гарлаа');
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Миний бараа</h2>
          <p className="text-sm text-foreground-muted mt-0.5">{loading ? 'Синк хийж байна...' : `${allProducts.length} нийт бараа`}</p>
        </div>
        <Link href="/supplier/products/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-hover transition-colors shadow-lg shadow-brand/20">
          <Plus size={16} /> Бараа нэмэх
        </Link>
      </div>

      {syncError && (
        <div className="rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-xs text-error">
          {syncError}
        </div>
      )}

      <BulkProductGrid onSaved={loadProducts} />

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
                <th className="px-4 py-3 text-center text-xs font-semibold text-foreground-muted uppercase tracking-wider">Үлдэгдэл</th>
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
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Package size={16} className="text-foreground-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[180px]">{product.name}</p>
                        <p className="text-[10px] text-foreground-muted">
                          {product.category ? categoryNameBySlug.get(product.category) ?? product.category : product.slug}
                        </p>
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
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${product.stock > 0 ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
                      {product.stock} ш
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
                    <button
                      disabled={savingId === product.id}
                      onClick={() => void toggleEnabled(product)}
                      className="text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50"
                      title={product.enabled ? 'Нуух' : 'Идэвхжүүлэх'}
                    >
                      {product.enabled ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        disabled={savingId === product.id}
                        onClick={() => openEdit(product)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        disabled={savingId === product.id}
                        onClick={() => void deleteProduct(product)}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-foreground-muted hover:text-error transition-colors disabled:opacity-50"
                      >
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--glass-border)] bg-card p-5 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">Бараа засах</h3>
            <div className="mt-4 grid gap-3">
              <label className="space-y-1">
                <span className="text-xs text-foreground-muted">Нэр</span>
                <input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-foreground-muted">Үнэ</span>
                  <input value={editForm.price} inputMode="numeric" onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-foreground-muted">Үлдэгдэл</span>
                  <input value={editForm.stock} inputMode="numeric" onChange={(e) => setEditForm((p) => ({ ...p, stock: e.target.value }))} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" />
                </label>
              </div>
              <label className="space-y-1">
                <span className="text-xs text-foreground-muted">Ангилал</span>
                <select value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand">
                  <option value="">Ангилалгүй</option>
                  {categoryGroups.map((group) => (
                    <optgroup key={group.parent.id} label={group.parent.name}>
                      <option value={group.parent.slug}>{group.parent.name} (үндсэн)</option>
                      {group.children.map((category) => (
                        <option key={category.id} value={category.slug}>
                          {`  ${category.name}`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {editForm.category && (
                  <p className="text-[11px] text-foreground-muted">
                    Сонгосон: {categoryNameBySlug.get(editForm.category) ?? editForm.category}
                  </p>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs text-foreground-muted">Барааны тайлбар / онцлог</span>
                <textarea value={editForm.description} rows={3} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} className="w-full resize-none rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </label>
              <button
                type="button"
                onClick={() => setEditForm((p) => ({ ...p, enabled: !p.enabled }))}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${editForm.enabled ? 'border-success/30 bg-success/10 text-success' : 'border-[var(--glass-border)] bg-surface text-foreground-muted'}`}
              >
                <span>Идэвхтэй эсэх</span>
                <span>{editForm.enabled ? 'Идэвхтэй' : 'Нуусан'}</span>
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-xl border border-[var(--glass-border)] px-4 py-2 text-sm text-foreground-muted hover:text-foreground">Болих</button>
              <button disabled={savingId === editing.id} onClick={() => void saveEdit()} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                {savingId === editing.id ? 'Хадгалж байна...' : 'Хадгалах'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
