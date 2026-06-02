import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, MapPin, Truck, Phone, ArrowLeft, Package } from 'lucide-react';
import { ProductCard } from '@/components/ui/ProductCard';
import { dbProductToCard, dbSupplierToCard, getDbSupplierBySlug, getDbSupplierProducts } from '@/lib/supplier-products';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return [];
}

export default async function SupplierStorePage({ params }: Props) {
  const { slug } = await params;
  const dbSupplier = await getDbSupplierBySlug(slug);
  if (dbSupplier?.status && dbSupplier.status !== 'ACTIVE') notFound();
  const supplier = dbSupplier ? dbSupplierToCard(dbSupplier) : null;
  if (!supplier) notFound();

  const dbProducts = dbSupplier ? await getDbSupplierProducts(dbSupplier.id) : [];
  const products = dbProducts.map((product) => dbProductToCard(product, supplier));

  return (
    <div className="min-h-screen bg-dark pb-24 lg:pb-8">
      {/* Back */}
      <div className="border-b border-[var(--glass-border)] bg-surface/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/suppliers" className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Нийлүүлэгчид
          </Link>
          <span className="text-foreground-muted">/</span>
          <span className="text-sm font-medium text-foreground truncate">{supplier.businessName}</span>
        </div>
      </div>

      {/* Supplier header */}
      <div className="relative overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-brand/20 via-surface to-card" />
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(255,69,0,0.6) 0%, transparent 70%)' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative -mt-12 flex flex-col sm:flex-row sm:items-end gap-4 pb-6">
            {/* Logo */}
            <div className="w-24 h-24 rounded-2xl bg-card border-4 border-dark flex items-center justify-center text-5xl shadow-xl shrink-0">
              🏪
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="font-display font-bold text-2xl text-foreground leading-tight">
                    {supplier.businessName}
                  </h1>
                  <div className="flex items-center flex-wrap gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={13} className={i < Math.round(supplier.rating) ? 'text-amber fill-amber' : 'text-foreground-muted/30'} fill={i < Math.round(supplier.rating) ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{supplier.rating}</span>
                      <span className="text-sm text-foreground-muted">({supplier.reviewCount})</span>
                    </div>
                    <span className="flex items-center gap-1 text-sm text-foreground-muted">
                      <MapPin size={13} /> {supplier.district}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-foreground-muted">
                      <Truck size={13} /> {supplier.deliveryTime}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-foreground-muted">
                      <Phone size={13} /> {supplier.phone}
                    </span>
                  </div>
                </div>
                <span className={`mt-1 shrink-0 text-sm px-3 py-1.5 rounded-xl font-semibold ${supplier.isOpen ? 'bg-success/15 text-success border border-success/30' : 'bg-foreground-muted/10 text-foreground-muted border border-foreground-muted/20'}`}>
                  {supplier.isOpen ? '● Нээлттэй' : '● Хаалттай'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {supplier.description && (
            <p className="text-sm text-foreground-muted mb-4 max-w-2xl leading-relaxed">{supplier.description}</p>
          )}

          {/* Address */}
          <div className="flex items-start gap-2 text-xs text-foreground-muted mb-6">
            <MapPin size={13} className="shrink-0 mt-0.5" />
            <span>{supplier.address}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        {/* Products header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-brand" />
            <h2 className="font-bold text-xl text-foreground">Бүтээгдэхүүн</h2>
            <span className="text-sm text-foreground-muted">({products.length})</span>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">📦</span>
            <p className="text-foreground-muted">Бараа байхгүй байна</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  badge: product.badge as any,
                }}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
