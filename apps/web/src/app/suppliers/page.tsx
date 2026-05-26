'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, MapPin, Truck, Search, Store, Filter } from 'lucide-react';
import { MOCK_SUPPLIERS, type SupplierCard } from '@/lib/supplier-data';

const DISTRICTS = ['Бүгд', 'Баянзүрх', 'Сүхбаатар', 'Хан-Уул', 'Баянгол', 'Чингэлтэй', 'Налайх'];

function SupplierCardComponent({ sup }: { sup: SupplierCard }) {
  return (
    <Link
      href={`/suppliers/${sup.slug}`}
      className="group block rounded-2xl bg-card border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all hover:shadow-xl hover:shadow-black/30 overflow-hidden"
    >
      {/* Header banner */}
      <div className="h-24 bg-gradient-to-br from-brand/20 to-surface relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 80% 50%, rgba(255,69,0,0.4) 0%, transparent 60%)' }} />
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-card border-2 border-[var(--glass-border)] flex items-center justify-center text-3xl shadow-lg">
            🏪
          </div>
        </div>
        <div className="absolute top-3 right-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sup.isOpen ? 'bg-success/20 text-success border border-success/30' : 'bg-foreground-muted/10 text-foreground-muted border border-foreground-muted/20'}`}>
            {sup.isOpen ? 'Нээлттэй' : 'Хаалттай'}
          </span>
        </div>
      </div>

      <div className="p-4 pt-5">
        <h3 className="font-bold text-base text-foreground group-hover:text-brand transition-colors leading-tight mb-1">
          {sup.businessName}
        </h3>

        <p className="text-xs text-foreground-muted line-clamp-2 mb-3 leading-relaxed">
          {sup.description}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={11}
                className={i < Math.round(sup.rating) ? 'text-amber fill-amber' : 'text-foreground-muted/30'}
                fill={i < Math.round(sup.rating) ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-foreground">{sup.rating}</span>
          <span className="text-xs text-foreground-muted">({sup.reviewCount} сэтгэгдэл)</span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-foreground-muted mb-3">
          <span className="flex items-center gap-1"><MapPin size={11} /> {sup.district}</span>
          <span className="flex items-center gap-1"><Truck size={11} /> {sup.deliveryTime}</span>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {sup.categories.slice(0, 3).map((cat) => (
            <span key={cat} className="text-[10px] px-2 py-0.5 rounded-md bg-surface text-foreground-muted border border-[var(--glass-border)]">
              {cat}
            </span>
          ))}
        </div>

        <div className="pt-3 border-t border-[var(--glass-border)] flex items-center justify-between">
          <span className="text-xs text-foreground-muted">{sup.productCount} бараа</span>
          <span className="text-xs font-semibold text-brand group-hover:underline">Дэлгүүр харах →</span>
        </div>
      </div>
    </Link>
  );
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('Бүгд');
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  const filtered = MOCK_SUPPLIERS.filter((s) => {
    if (showOpenOnly && !s.isOpen) return false;
    if (district !== 'Бүгд' && s.district !== district) return false;
    if (search && !s.businessName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-dark pb-24 lg:pb-8">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] bg-surface/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Store size={24} className="text-brand" />
            <h1 className="font-display font-bold text-3xl text-foreground">Нийлүүлэгчид</h1>
          </div>
          <p className="text-foreground-muted mb-6">100+ найдвартай нийлүүлэгчийн дэлгүүрүүд</p>

          {/* Search */}
          <div className="relative max-w-lg">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Нийлүүлэгч хайх..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-[var(--glass-border)] text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Filter size={14} className="text-foreground-muted" />
          <div className="flex gap-2 flex-wrap">
            {DISTRICTS.map((d) => (
              <button
                key={d}
                onClick={() => setDistrict(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${district === d ? 'bg-brand text-white' : 'bg-card border border-[var(--glass-border)] text-foreground-muted hover:text-foreground'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground-muted cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={showOpenOnly}
              onChange={(e) => setShowOpenOnly(e.target.checked)}
              className="w-4 h-4 rounded accent-brand"
            />
            Зөвхөн нээлттэй
          </label>
        </div>

        {/* Count */}
        <p className="text-sm text-foreground-muted mb-4">
          <span className="font-semibold text-foreground">{filtered.length}</span> нийлүүлэгч олдлоо
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">🔍</span>
            <p className="text-foreground-muted">Тохирох нийлүүлэгч олдсонгүй</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((sup) => (
              <SupplierCardComponent key={sup.id} sup={sup} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
