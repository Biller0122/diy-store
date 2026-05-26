'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { Search, ArrowUpDown, ChevronRight, Download } from 'lucide-react';
import { MOCK_ORDERS, type AdminOrder } from '@/lib/admin-data';

const TABS = [
  { key: '', label: 'Бүгд' },
  { key: 'PaymentAuthorized', label: 'Хүлээгдэж буй' },
  { key: 'PaymentSettled', label: 'Боловсруулж буй' },
  { key: 'Shipped', label: 'Илгээсэн' },
  { key: 'Delivered', label: 'Хүргэгдсэн' },
  { key: 'Cancelled', label: 'Цуцлагдсан' },
];

const STATE_BADGE: Record<string, string> = {
  PaymentAuthorized: 'bg-blue-500/15 text-blue-400',
  PaymentSettled:    'bg-green-500/15 text-green-400',
  Shipped:           'bg-purple-500/15 text-purple-400',
  Delivered:         'bg-emerald-500/15 text-emerald-400',
  Cancelled:         'bg-red-500/15 text-red-400',
};
const STATE_LABEL: Record<string, string> = {
  PaymentAuthorized: 'Хүлээгдэж буй',
  PaymentSettled:    'Боловсруулж буй',
  Shipped:           'Илгээсэн',
  Delivered:         'Хүргэгдсэн',
  Cancelled:         'Цуцлагдсан',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
}

export default function AdminOrdersPage() {
  const [tab, setTab] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    MOCK_ORDERS.filter(o =>
      (tab === '' || o.state === tab) &&
      (search === '' ||
        o.code.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer?.phoneNumber ?? '').includes(search) ||
        `${o.customer?.firstName} ${o.customer?.lastName}`.toLowerCase().includes(search.toLowerCase()))
    ), [tab, search]);

  const columns = useMemo<ColumnDef<AdminOrder>[]>(() => [
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-foreground-muted hover:text-foreground" onClick={() => column.toggleSorting()}>
          Дугаар <ArrowUpDown size={11} />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-xs font-mono font-bold text-brand">#{getValue() as string}</span>,
    },
    {
      id: 'customer',
      header: 'Хэрэглэгч',
      accessorFn: (r) => `${r.customer?.firstName ?? ''} ${r.customer?.lastName ?? ''}`.trim(),
      cell: ({ row, getValue }) => (
        <div>
          <p className="text-xs font-semibold text-foreground">{getValue() as string}</p>
          <p className="text-[10px] text-foreground-muted">{row.original.customer?.phoneNumber}</p>
        </div>
      ),
    },
    {
      accessorKey: 'paymentState',
      header: 'Төлбөр',
      cell: ({ getValue }) => (
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'state',
      header: 'Гүйцэтгэл',
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return (
          <span className={`text-[10px] px-2 py-0.5 rounded-lg ${STATE_BADGE[s] ?? 'bg-white/10 text-foreground-muted'}`}>
            {STATE_LABEL[s] ?? s}
          </span>
        );
      },
    },
    {
      accessorKey: 'itemCount',
      header: 'Тоо',
      cell: ({ getValue }) => <span className="text-xs text-foreground-muted">{getValue() as number} ш</span>,
    },
    {
      accessorKey: 'totalWithTax',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-foreground-muted hover:text-foreground" onClick={() => column.toggleSorting()}>
          Нийт <ArrowUpDown size={11} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs font-bold text-foreground">
          ₮{Math.round((getValue() as number) / 100).toLocaleString('mn-MN')}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Огноо',
      cell: ({ getValue }) => <span className="text-xs text-foreground-muted">{formatDate(getValue() as string)}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Link href={`/admin/orders/${row.original.id}`} className="p-1.5 rounded-lg hover:bg-white/10 text-foreground-muted hover:text-foreground transition-colors inline-flex">
          <ChevronRight size={14} />
        </Link>
      ),
      size: 44,
    },
  ], []);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleExportCSV = () => {
    const rows = filtered.map(o =>
      [o.code, `${o.customer?.firstName} ${o.customer?.lastName}`, o.state, Math.round(o.totalWithTax / 100), formatDate(o.createdAt)].join(',')
    );
    const csv = ['Дугаар,Хэрэглэгч,Төлөв,Нийт,Огноо', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-brand text-white' : 'bg-card text-foreground-muted hover:text-foreground border border-[var(--glass-border)]'
            }`}
          >
            {t.label}
            {t.key !== '' && (
              <span className="ml-1.5 opacity-60">
                {MOCK_ORDERS.filter(o => o.state === t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + export */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Захиалгын дугаар эсвэл утас хайх..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-card text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-brand/50"
          />
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-[var(--glass-border)] text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          <Download size={13} /> CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-[var(--glass-border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[var(--glass-border)]">
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--glass-border)] last:border-0 hover:bg-white/[0.02] transition-colors">
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
          <div className="py-12 text-center text-foreground-muted text-sm">Захиалга олдсонгүй</div>
        )}
      </div>

      <p className="text-xs text-foreground-muted text-right">{filtered.length} захиалга</p>
    </div>
  );
}
