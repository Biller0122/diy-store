import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle2, CirclePlay, MapPin, Package, Phone, Star, Store } from 'lucide-react';
import { ProductCard } from '@/components/ui/ProductCard';
import { dbProductToCard, dbSupplierToCard, getDbSupplierBySlug, getDbSupplierProducts } from '@/lib/supplier-products';
import { resolveVendureAssetUrl } from '@/lib/vendure';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SupplierStorePage({ params }: Props) {
  const { slug } = await params;
  const dbSupplier = await getDbSupplierBySlug(slug);
  if (!dbSupplier || (dbSupplier.status && dbSupplier.status !== 'ACTIVE')) notFound();

  const supplier = dbSupplierToCard(dbSupplier);
  const dbProducts = await getDbSupplierProducts(dbSupplier.id);
  const products = dbProducts.map((product) => dbProductToCard(product, supplier));
  const youtubeId = getYoutubeId(dbSupplier.youtubeUrl ?? '');
  const coverImage = resolveVendureAssetUrl(dbSupplier.coverImage);
  const logo = resolveVendureAssetUrl(dbSupplier.logo);
  const posters = (dbSupplier.posterUrls ?? []).map(resolveVendureAssetUrl).filter(Boolean);
  const initials = supplier.businessName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-dark pb-24 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <Link href="/suppliers" className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted transition-colors hover:text-brand">
          <ArrowLeft size={16} /> Нийлүүлэгчид
        </Link>

        <section id="profile-home" className="scroll-mt-20 overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-card shadow-xl shadow-black/5">
          <div className="relative h-48 overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.22),transparent_25%),linear-gradient(120deg,#111827_0%,#233553_45%,#ff4b00_140%)] md:h-64">
            {coverImage && <Image src={coverImage} alt={`${supplier.businessName} cover`} fill priority className="object-cover" />}
            {coverImage && <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/10" />}
            <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full border-[48px] border-white/5" />
            <div className="absolute bottom-0 right-0 hidden w-[52%] -skew-x-12 bg-brand/90 py-20 md:block" />
            <div className="absolute left-6 top-6 max-w-md text-white md:left-10 md:top-10">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.2em] backdrop-blur">ТАНЫ БРЭНДИЙН ОРОН ЗАЙ</span>
              <p className="mt-4 text-2xl font-black leading-tight md:text-4xl">Чанартай бараа.<br />Найдвартай үйлчилгээ.</p>
            </div>
          </div>

          <div className="relative px-5 pb-6 md:px-9">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="relative -mt-14 h-28 w-28 shrink-0 overflow-hidden rounded-[26px] border-4 border-card bg-gradient-to-br from-brand to-[#ff8b33] shadow-lg md:-mt-16 md:h-32 md:w-32">
                {logo ? <Image src={logo} alt={supplier.businessName} fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">{initials || <Store />}</div>}
              </div>

              <div className="min-w-0 flex-1 pt-4 md:pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-foreground md:text-3xl">{supplier.businessName}</h1>
                  <CheckCircle2 size={20} className="fill-brand text-white" />
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">Нээлттэй</span>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-foreground-muted">{supplier.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground-muted">
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand" />{supplier.district}</span>
                  <span className="flex items-center gap-1.5"><Phone size={14} className="text-brand" />{supplier.phone}</span>
                  <span className="flex items-center gap-1.5"><Star size={14} className="fill-amber-400 text-amber-400" />{supplier.rating || 'Шинэ'} үнэлгээ</span>
                </div>
              </div>

              <a href={`tel:${supplier.phone}`} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white md:mt-5">
                <Phone size={16} /> Холбогдох
              </a>
            </div>

            <nav className="mt-6 flex gap-6 overflow-x-auto border-t border-[var(--glass-border)] pt-4 text-sm font-semibold text-foreground-muted">
              <a href="#profile-home" className="border-b-2 border-brand pb-3 text-brand">Нүүр</a>
              <a href="#products" className="whitespace-nowrap pb-3 hover:text-brand">Бүх бараа</a>
              {posters.length > 0 && <a href="#posters" className="whitespace-nowrap pb-3 hover:text-brand">Постерууд</a>}
              {youtubeId && <a href="#about-video" className="whitespace-nowrap pb-3 hover:text-brand">Дэлгүүрийн тухай</a>}
            </nav>
          </div>
        </section>

        {youtubeId && (
          <section id="about-video" className="scroll-mt-20 rounded-3xl border border-[var(--glass-border)] bg-card p-4 md:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground"><CirclePlay size={20} className="text-brand" /> Манай дэлгүүрийн тухай</h2>
            <div className="relative aspect-video max-h-[620px] overflow-hidden rounded-2xl bg-surface">
              <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}`} title={`${supplier.businessName} танилцуулга`} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            </div>
          </section>
        )}

        {posters.length > 0 && (
          <section id="posters" className="scroll-mt-20 rounded-3xl border border-[var(--glass-border)] bg-card p-4 md:p-6">
            <h2 className="text-lg font-bold text-foreground">Онцлох сурталчилгаа</h2>
            <p className="mt-1 text-xs text-foreground-muted">Улирлын санал, шинэ бараа, багцын постерууд</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {posters.map((url, index) => <div key={url} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface"><Image src={url} alt={`Сурталчилгааны постер ${index + 1}`} fill className="object-cover" /></div>)}
            </div>
          </section>
        )}

        <section id="products" className="scroll-mt-20 rounded-3xl border border-[var(--glass-border)] bg-card p-4 md:p-6">
          <div className="mb-5 flex items-center gap-2"><Package size={19} className="text-brand" /><h2 className="text-lg font-bold text-foreground">Манай бараанууд</h2><span className="text-sm text-foreground-muted">({products.length})</span></div>
          {products.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{products.map((product, index) => <ProductCard key={product.id} product={{ ...product, badge: product.badge as never }} index={index} />)}</div>
          ) : (
            <div className="flex flex-col items-center py-14 text-center"><Package size={30} className="text-foreground-muted" /><p className="mt-3 text-sm text-foreground-muted">Одоогоор бараа алга</p></div>
          )}
        </section>
      </div>
    </div>
  );
}

function getYoutubeId(value: string) {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] ?? '';
    if (!url.hostname.endsWith('youtube.com')) return '';
    if (url.pathname === '/watch') return url.searchParams.get('v') ?? '';
    const parts = url.pathname.split('/').filter(Boolean);
    return ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] ?? '' : '';
  } catch {
    return '';
  }
}
