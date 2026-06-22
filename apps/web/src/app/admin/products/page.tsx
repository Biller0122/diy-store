'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { Plus, Search, Download, Package, ArrowUpDown, Pencil, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import type { AdminProduct } from '@/lib/admin-data';
import { vendureAdminFetch } from '@/lib/vendure';
import { formatPrice } from '@/lib/price';

type AdminProductRow = AdminProduct & {
  supplierId?: string;
  supplierName?: string;
};

type SupplierProductApi = {
  id: string;
  supplierId: string;
  name: string;
  slug: string;
  category?: string | null;
  image?: string | null;
  price: number;
  stock: number;
  enabled: boolean;
};

type SupplierApi = {
  id: string;
  businessName: string;
  ownerName: string;
};

const SUPPLIER_PRODUCTS_QUERY = `
  query AdminSupplierProducts {
    supplierProducts {
      items {
        id
        supplierId
        name
        slug
        category
        image
        price
        stock
        enabled
      }
    }
    getAllSuppliers {
      items {
        id
        businessName
        ownerName
      }
    }
  }
`;

const DELETE_SUPPLIER_PRODUCT_MUTATION = `
  mutation DeleteSupplierProduct($id: ID!) {
    deleteSupplierProduct(id: $id)
  }
`;

const STOCK_BADGE: Record<string, string> = {
  IN_STOCK:     'bg-emerald-500/15 text-emerald-400',
  LOW_STOCK:    'bg-amber-500/15 text-amber-400',
  OUT_OF_STOCK: 'bg-error/15 text-error',
};
const STOCK_LABEL: Record<string, string> = {
  IN_STOCK: 'Нөөцтэй', LOW_STOCK: 'Бага', OUT_OF_STOCK: 'Дууссан',
};

export default function AdminProductsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dbProducts, setDbProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminProductRow | null>(null);
  const [deletingId, setDeletingId] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(dbProducts.flatMap((p) => p.collections.map((c) => c.name)))),
    [dbProducts],
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    vendureAdminFetch<{
      supplierProducts: { items: SupplierProductApi[] };
      getAllSuppliers: { items: SupplierApi[] };
    }>(SUPPLIER_PRODUCTS_QUERY)
      .then((data) => {
        if (!mounted) return;
        const suppliers = new Map(data.getAllSuppliers.items.map((supplier) => [
          String(supplier.id),
          supplier.businessName || supplier.ownerName || 'Нийлүүлэгч',
        ]));
        setDbProducts(data.supplierProducts.items.map((product): AdminProductRow => {
          const stockLevel = product.stock <= 0 ? 'OUT_OF_STOCK' : product.stock <= 5 ? 'LOW_STOCK' : 'IN_STOCK';
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: '',
            enabled: product.enabled,
            supplierId: product.supplierId,
            supplierName: suppliers.get(String(product.supplierId)) ?? product.supplierId,
            featuredAsset: product.image ? { preview: product.image } : undefined,
            variants: [{
              id: product.id,
              sku: product.slug,
              priceWithTax: product.price,
              stockOnHand: product.stock,
              stockLevel,
            }],
            collections: product.category ? [{ id: product.category, name: product.category }] : [],
          };
        }));
        setSyncError('');
      })
      .catch((err) => {
        if (mounted) setSyncError(err instanceof Error ? err.message : 'Supplier бараа татахад алдаа гарлаа');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const products = useMemo<AdminProductRow[]>(
    () => dbProducts.filter((product) => {
      const categoryOk = !categoryFilter || product.collections.some((c) => c.name === categoryFilter);
      const statusOk = !statusFilter || (statusFilter === 'active' ? product.enabled : !product.enabled);
      return categoryOk && statusOk;
    }),
    [categoryFilter, dbProducts, statusFilter],
  );

  async function confirmDeleteProduct() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setSyncError('');
    try {
      await vendureAdminFetch(DELETE_SUPPLIER_PRODUCT_MUTATION, { id: deleteTarget.id });
      setDbProducts((items) => items.filter((product) => product.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Бараа устгахад алдаа гарлаа');
    } finally {
      setDeletingId('');
    }
  }

  const columns = useMemo<ColumnDef<AdminProductRow>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="accent-brand"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="accent-brand"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      size: 36,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-foreground-muted hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          Нэр <ArrowUpDown size={11} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
            <Package size={13} className="text-foreground-muted" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{row.original.name}</p>
            <p className="text-[10px] text-foreground-muted">{row.original.variants[0]?.sku}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'supplier',
      header: 'Нийлүүлэгч',
      accessorFn: (r) => r.supplierName ?? 'shoptool.mn',
      cell: ({ getValue }) => <span className="text-xs font-semibold text-foreground-muted">{getValue() as string}</span>,
    },
    {
      id: 'sku',
      header: 'SKU',
      accessorFn: (r) => r.variants[0]?.sku ?? '',
      cell: ({ getValue }) => <span className="text-xs font-mono text-foreground-muted">{getValue() as string}</span>,
    },
    {
      id: 'category',
      header: 'Ангилал',
      accessorFn: (r) => r.collections.map((c) => c.name).join(', '),
      cell: ({ getValue }) => <span className="text-xs text-foreground-muted">{getValue() as string}</span>,
    },
    {
      accessorFn: (r) => r.variants[0]?.priceWithTax ?? 0,
      id: 'price',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-foreground-muted hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          Үнэ <ArrowUpDown size={11} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs font-semibold text-foreground">
          ₮{Number(formatPrice(getValue() as number)).toLocaleString('mn-MN')}
        </span>
      ),
    },
    {
      accessorFn: (r) => r.variants[0]?.stockOnHand ?? 0,
      id: 'stock',
      header: 'Нөөц',
      cell: ({ row }) => {
        const lvl = row.original.variants[0]?.stockLevel ?? 'OUT_OF_STOCK';
        const qty = row.original.variants[0]?.stockOnHand ?? 0;
        return (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-lg ${STOCK_BADGE[lvl] ?? 'bg-white/10 text-foreground-muted'}`}>
              {STOCK_LABEL[lvl] ?? lvl}
            </span>
            <span className="text-xs text-foreground-muted">{qty} ш</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'enabled',
      header: 'Төлөв',
      cell: ({ getValue }) => {
        const enabled = getValue() as boolean;
        return (
          <span className={`text-[10px] px-2 py-0.5 rounded-lg ${enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-foreground-muted'}`}>
            {enabled ? 'Идэвхтэй' : 'Нуусан'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/product/${row.original.slug}`}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground-muted hover:text-foreground transition-colors"
          >
            <Eye size={13} />
          </Link>
          <Link
            href={`/admin/products/${row.original.id}/edit`}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground-muted hover:text-foreground transition-colors"
          >
            <Pencil size={13} />
          </Link>
          <button
            onClick={() => setDeleteTarget(row.original)}
            disabled={deletingId === row.original.id}
            className="p-1.5 rounded-lg hover:bg-error/10 text-foreground-muted hover:text-error transition-colors disabled:opacity-50"
            title="Устгах"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
      size: 80,
    },
  ], [deletingId]);

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const handleExportCSV = () => {
    const rows = products.map(p =>
      [p.name, p.supplierName ?? 'shoptool.mn', p.variants[0]?.sku, formatPrice(p.variants[0]?.priceWithTax ?? 0), p.variants[0]?.stockOnHand, p.enabled].join(',')
    );
    const csv = ['Нэр,Нийлүүлэгч,SKU,Үнэ,Нөөц,Идэвхтэй', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-foreground-muted">{loading ? 'Синк хийж байна...' : `${products.length} бараа`}</p>
        <div className="flex items-center gap-2">
          <button className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-[var(--glass-border)] text-xs text-foreground-muted hover:text-foreground transition-colors">
            <CheckCircle size={13} /> Идэвхжүүлэх
          </button>
          <button className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-[var(--glass-border)] text-xs text-foreground-muted hover:text-error transition-colors">
            <XCircle size={13} /> Нуух
          </button>
          <button className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-error/10 border border-error/20 text-xs text-error hover:bg-error/20 transition-colors">
            <Trash2 size={13} /> Устгах
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-[var(--glass-border)] text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            <Download size={13} /> CSV
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
          >
            <Plus size={13} /> Бараа нэмэх
          </Link>
        </div>
      </div>

      {/* Search */}
      {syncError && (
        <div className="rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-xs text-error">
          {syncError}
        </div>
      )}

      {/* Search */}
      <div className="grid gap-2 md:grid-cols-[1fr_180px_160px]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Бараа, SKU хайх..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-card text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-brand/50"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-[var(--glass-border)] bg-card px-3 py-2.5 text-sm text-foreground-muted focus:outline-none focus:border-brand/50">
          <option value="">Бүх ангилал</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-[var(--glass-border)] bg-card px-3 py-2.5 text-sm text-foreground-muted focus:outline-none focus:border-brand/50">
          <option value="">Бүх төлөв</option>
          <option value="active">Идэвхтэй</option>
          <option value="hidden">Нуусан</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-[var(--glass-border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[var(--glass-border)]">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted first:pl-4"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--glass-border)] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {table.getRowModel().rows.length === 0 && (
          <div className="py-12 text-center text-foreground-muted text-sm">
            Бүтээгдэхүүн олдсонгүй
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-muted">
          Хуудас {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
        </p>
        <div className="flex gap-2">
          <button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} className="rounded-xl border border-[var(--glass-border)] bg-card px-3 py-2 text-xs text-foreground-muted disabled:opacity-40">
            Өмнөх
          </button>
          <button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} className="rounded-xl border border-[var(--glass-border)] bg-card px-3 py-2 text-xs text-foreground-muted disabled:opacity-40">
            Дараах
          </button>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--glass-border)] bg-card p-5 shadow-2xl">
            <h2 className="text-base font-bold text-foreground">Бараа устгах уу?</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {deleteTarget.name} барааг устгавал supplier catalog-оос хасагдана.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={!!deletingId}
                className="rounded-xl border border-[var(--glass-border)] px-4 py-2 text-sm text-foreground-muted hover:text-foreground disabled:opacity-50"
              >
                Болих
              </button>
              <button
                onClick={() => void confirmDeleteProduct()}
                disabled={!!deletingId}
                className="rounded-xl bg-error px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {deletingId ? 'Устгаж байна...' : 'Устгах'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
