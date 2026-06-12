import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Clock, Flame, MapPin, Package, Search, Sparkles, Star, Store, Truck } from 'lucide-react';
import { vendureShopFetch, type VendureCollection } from '@/lib/vendure';
import { TrustStrip } from '@/components/ui/TrustStrip';
import { ProductCard, type ProductCardData } from '@/components/ui/ProductCard';
import { HomepageBanner, type HomepageBannerData } from '@/components/ui/HomepageBanner';
import { ARTICLES } from './how-to/articles';
import { dbProductToCard, dbSupplierToCard, getDbSupplierProductCount, getDbSupplierProducts, getDbSuppliers, supplierProductMatchesCategory, type DbSupplierProduct } from '@/lib/supplier-products';
import { BrandLogo } from '@/components/BrandLogo';

// ─── Data fetching ────────────────────────────────────────────

function localPortalBase(port: number) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  return siteUrl.startsWith('http://localhost')
    || siteUrl.startsWith('https://localhost')
    || siteUrl.startsWith('http://127.0.0.1')
    || siteUrl.startsWith('https://127.0.0.1')
    ? `http://localhost:${port}`
    : '';
}

function portalHref(baseUrl: string | undefined, localPort: number, path: string) {
  const base = (baseUrl || localPortalBase(localPort)).replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

const merchantLoginHref = portalHref(process.env.NEXT_PUBLIC_MERCHANT_URL, 18083, '/supplier/login');
const driverRegisterHref = portalHref(process.env.NEXT_PUBLIC_DRIVER_URL, 18082, '/driver/register');

const COLLECTIONS_QUERY = `
  query Collections {
    collections(options: { take: 12, topLevelOnly: true, sort: { position: ASC } }) {
      items {
        id name slug parentId
        customFields { icon }
        productVariants(options: { take: 1 }) { totalItems }
      }
    }
  }
`;

const FEATURED_QUERY = `
  query Featured {
    search(input: { take: 12, sort: { name: ASC } }) {
      totalItems
      items {
        productId productVariantId productName slug
        productAsset { preview }
        priceWithTax { ... on SinglePrice { value } }
        inStock
      }
    }
  }
`;

const HOMEPAGE_BANNERS_QUERY = `
  query HomepageBanners {
    homepageBanners {
      id
      title
      subtitle
      eyebrow
      ctaLabel
      ctaHref
      imageUrl
      accentColor
    }
  }
`;

async function getCollections(): Promise<VendureCollection[]> {
  try {
    const data = await vendureShopFetch<{ collections: { items: VendureCollection[] } }>(COLLECTIONS_QUERY);
    return (data.collections?.items ?? []).filter((item) => item.slug !== '__root_collection__');
  } catch {
    return [];
  }
}

async function getFeaturedProducts(): Promise<ProductCardData[]> {
  try {
    const data = await vendureShopFetch<{ search: { items: any[] } }>(FEATURED_QUERY);
    return (data.search?.items ?? []).map((item: any, i: number) => ({
      id: item.productId,
      variantId: item.productVariantId,
      name: item.productName,
      slug: item.slug,
      image: item.productAsset?.preview ?? '',
      price: item.priceWithTax?.value ?? 0,
      rating: 0,
      reviewCount: 0,
      badge: i === 0 ? 'ТОП' : i < 3 ? 'ШИНЭ' : undefined,
      inStock: item.inStock,
    })) as ProductCardData[];
  } catch {
    return [];
  }
}

async function getCatalogProductCount() {
  try {
    const data = await vendureShopFetch<{ search: { totalItems: number } }>(FEATURED_QUERY, undefined, { revalidate: 0 });
    return data.search?.totalItems ?? 0;
  } catch {
    return 0;
  }
}

async function getHomepageBanners(): Promise<HomepageBannerData[]> {
  try {
    const data = await vendureShopFetch<{ homepageBanners: HomepageBannerData[] }>(
      HOMEPAGE_BANNERS_QUERY,
      undefined,
      { revalidate: 0 },
    );
    return data.homepageBanners ?? [];
  } catch {
    return [];
  }
}

const HOW_IT_WORKS = [
  { step: 1, icon: '🛒', title: 'Бараа сонго', desc: 'Дурын нийлүүлэгчийн дэлгүүрээс хайж олоорой' },
  { step: 2, icon: '📦', title: 'Захиалга өг', desc: 'Олон нийлүүлэгчийн захиалгыг нэг дор хийнэ' },
  { step: 3, icon: '🏍️', title: 'Жолооч авна', desc: 'Хамгийн ойр жолооч таны захиалгыг хүлээж авна' },
  { step: 4, icon: '📍', title: 'Хүргэлт хянах', desc: 'Жолоочийн байршлыг шууд хянана уу' },
];

const CATEGORY_FALLBACK_ICONS = ['🏗️', '🔩', '🧱', '🚿', '🪵', '🎨', '🧰', '💡'];

// ─── Components ───────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, subtitle, href, actionLabel = 'Бүгдийг харах',
}: {
  icon: React.ElementType; title: string; subtitle?: string; href?: string; actionLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon size={18} className="text-brand" />
          <h2 className="font-display font-bold text-2xl text-foreground">{title}</h2>
        </div>
        {subtitle && <p className="text-foreground-muted text-sm">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-sm text-brand hover:text-brand-light transition-colors font-medium">
          {actionLabel} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

function MarketplaceHero({ supplierCount, productCount }: { supplierCount: number; productCount: number }) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:pb-24 lg:pt-16">
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-dark to-transparent" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-4 py-2 text-xs font-bold text-brand">
            <Sparkles size={13} /> Барилгын материалын ухаалаг шийдэл
          </div>
          <h1 className="font-display text-5xl font-black leading-[0.98] text-foreground sm:text-6xl lg:text-7xl">
            Барилгын материалыг{' '}
            <span className="text-brand">нэг платформоос.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-foreground-muted sm:text-lg">
            Нийлүүлэгч, бүтээгдэхүүн, хүргэлтийг нэг дор холбосон shoptool.mn платформ. Бодит үнэ, шуурхай хүргэлт, найдвартай захиалга.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/search" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-sm font-black text-white shadow-xl shadow-brand/25 transition-transform hover:-translate-y-0.5">
              <Search size={17} /> Материал хайх <ArrowRight size={16} />
            </Link>
            <Link href="/suppliers" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] bg-card px-6 py-4 text-sm font-black text-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:border-brand/40">
              <Store size={17} /> Нийлүүлэгчид үзэх
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Package, value: productCount.toLocaleString('mn-MN'), label: 'Бүтээгдэхүүн' },
              { icon: Store, value: supplierCount.toLocaleString('mn-MN'), label: 'Нийлүүлэгч' },
              { icon: Clock, value: '30 мин', label: 'Дундаж хариу' },
              { icon: Truck, value: '24ц', label: 'Хүргэлт' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-2xl border border-[var(--glass-border)] bg-card/85 p-4 shadow-[var(--card-shadow)] backdrop-blur">
                <Icon size={22} className="mb-3 text-brand" />
                <p className="font-mono text-2xl font-black text-brand">{value}</p>
                <p className="mt-1 text-xs font-semibold text-foreground-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[420px] lg:min-h-[560px]">
          <div className="absolute inset-x-4 bottom-4 top-20 rounded-[44px] bg-brand shadow-[0_30px_120px_rgba(255,69,0,0.32)] lg:inset-x-10" />
          <div className="absolute inset-0 rounded-[46px] bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.38),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.18),rgba(0,0,0,0.12))]" />
          <div className="absolute bottom-0 right-0 w-[88%] overflow-hidden rounded-[28px] border border-white/20 bg-neutral-900 shadow-2xl">
            <div className="aspect-[1.28/1] bg-[linear-gradient(115deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_72px),linear-gradient(25deg,#2c3035,#0b0f14_52%,#f97316_53%,#111827_54%)]">
              <div className="grid h-full grid-cols-3 gap-px p-6">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="rounded-sm border border-white/10 bg-white/10 shadow-inner" />
                ))}
              </div>
            </div>
          </div>
          <div className="absolute left-0 top-8 rounded-3xl border border-[var(--glass-border)] bg-card/90 p-4 shadow-[var(--card-shadow)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-3xl">🧱</div>
              <div>
                <p className="text-sm font-black text-foreground">Тоосго, цемент</p>
                <p className="text-xs text-foreground-muted">80+ бүтээгдэхүүн</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-10 left-4 max-w-sm rounded-3xl border border-white/15 bg-black/70 p-5 text-white shadow-2xl backdrop-blur">
            {['Баталгаатай бүтээгдэхүүн', 'Өрсөлдөхүйц үнэ', 'Шуурхай хүргэлт'].map((label) => (
              <div key={label} className="flex items-center gap-2 py-1 text-sm font-semibold">
                <CheckCircle2 size={16} className="text-brand" /> {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryRail({ collections, supplierProducts }: { collections: VendureCollection[]; supplierProducts: DbSupplierProduct[] }) {
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6">
      <div className="rounded-[28px] border border-[var(--glass-border)] bg-card p-5 shadow-[var(--card-shadow)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground">Ангиллууд</h2>
          <Link href="/category" className="inline-flex items-center gap-1 text-xs font-bold text-foreground-muted hover:text-brand">
            Бүгдийг харах <ArrowRight size={13} />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {collections.slice(0, 8).map((category, index) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="min-w-[132px] rounded-2xl border border-[var(--glass-border)] bg-surface p-3 text-center transition hover:-translate-y-0.5 hover:border-brand/35"
            >
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-4xl">
                {category.customFields?.icon ?? CATEGORY_FALLBACK_ICONS[index % CATEGORY_FALLBACK_ICONS.length]}
              </div>
              <p className="line-clamp-1 text-sm font-bold text-foreground">{category.name}</p>
              <p className="mt-1 text-[11px] text-foreground-muted">
                {getDbSupplierProductCountForCategory(supplierProducts, category).toLocaleString('mn-MN')}+ бүтээгдэхүүн
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function getDbSupplierProductCountForCategory(products: DbSupplierProduct[], category: VendureCollection) {
  return products.filter((product) => product.enabled && supplierProductMatchesCategory(product, category, true)).length;
}

function SupplierSection({ suppliers }: { suppliers: ReturnType<typeof dbSupplierToCard>[] }) {
  const featured = suppliers.slice(0, 4);
  return (
    <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6">
      <SectionHeader icon={Store} title="Дэлгүүрүүд" subtitle="Найдвартай нийлүүлэгчдээс шууд захиалаарай" href="/suppliers" actionLabel="Бүгд" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--glass-border)] p-8 text-sm text-foreground-muted sm:col-span-2 lg:col-span-4">
            Backend дээр идэвхтэй нийлүүлэгч алга байна.
          </div>
        ) : featured.map((sup) => (
          <Link
            key={sup.id}
            href={`/suppliers/${sup.slug}`}
            className="group block rounded-2xl bg-card border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all hover:shadow-lg hover:shadow-black/30 p-5"
          >
            {/* Logo */}
            <div className="w-14 h-14 rounded-2xl bg-brand/15 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🏪
            </div>

            <h3 className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors leading-tight mb-1">
              {sup.businessName}
            </h3>

            <div className="flex items-center gap-1 mb-2">
              <Star size={11} className="text-amber fill-amber" fill="currentColor" />
              <span className="text-xs font-semibold text-foreground">{sup.rating}</span>
              <span className="text-xs text-foreground-muted">({sup.reviewCount})</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-foreground-muted mb-3">
              <MapPin size={11} /> {sup.district}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground-muted">{sup.productCount} бараа</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sup.isOpen ? 'bg-success/15 text-success' : 'bg-foreground-muted/15 text-foreground-muted'}`}>
                {sup.isOpen ? 'Нээлттэй' : 'Хаалттай'}
              </span>
            </div>

            <div className="flex items-center gap-1 mt-2 text-xs text-foreground-muted">
              <Truck size={11} /> {sup.deliveryTime}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="py-16 border-y border-[var(--glass-border)] bg-surface/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-3xl text-foreground mb-2">Хэрхэн ажилладаг вэ?</h2>
          <p className="text-foreground-muted">4 алхамаар таны бараа хүргэгдэнэ</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map(({ step, icon, title, desc }) => (
            <div key={step} className="relative text-center">
              {step < 4 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-brand/40 to-transparent" />
              )}
              <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-3xl mx-auto mb-4">
                {icon}
              </div>
              <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold mx-auto -mt-8 mb-4 border-2 border-dark">
                {step}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-foreground-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--glass-border)] bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <BrandLogo imageClassName="w-40" />
            </div>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Монголын барилгын материалын ухаалаг шийдэл. 100+ нийлүүлэгч, шуурхай хүргэлт.
            </p>
          </div>
          {[
            { title: 'Платформ', links: ['Нийлүүлэгч болох', 'Жолооч болох', 'Бүх ангилал', 'Шинэ бараа'] },
            { title: 'Компани', links: ['Бидний тухай', 'Карьер', 'Хэвлэлийн мэдэгдэл', 'Холбоо барих'] },
            { title: 'Тусламж', links: ['Захиалга хянах', 'Буцаалт', 'Баталгаа', 'Хаяг олох'] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="font-semibold text-foreground text-sm mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l}>
                    <Link href={footerHref(l)} className="text-sm text-foreground-muted hover:text-foreground transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--glass-border)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground-muted">© 2025 shoptool.mn Marketplace. Бүх эрх хуулиар хамгаалагдсан.</p>
          <div className="flex items-center gap-4 text-xs text-foreground-muted">
            <Link href="/trade" className="hover:text-foreground transition-colors">Нууцлалын бодлого</Link>
            <Link href="/trade" className="hover:text-foreground transition-colors">Үйлчилгээний нөхцөл</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function footerHref(label: string) {
  const routes: Record<string, string> = {
    'Нийлүүлэгч болох': merchantLoginHref,
    'Жолооч болох': driverRegisterHref,
    'Бүх ангилал': '/category',
    'Шинэ бараа': '/#new-products',
    'Бидний тухай': '/trade',
    'Карьер': driverRegisterHref,
    'Хэвлэлийн мэдэгдэл': '/how-to',
    'Холбоо барих': '/trade',
    'Захиалга хянах': '/track/demo',
    'Буцаалт': '/trade',
    'Баталгаа': '/trade',
    'Хаяг олох': '/stores',
  };
  return routes[label] ?? '/';
}

// ─── Page ─────────────────────────────────────────────────────

export default async function HomePage() {
  const [collections, catalogProducts, supplierProducts, supplierProductCount, suppliersResult, catalogProductCount, banners] = await Promise.all([
    getCollections(),
    getFeaturedProducts(),
    getDbSupplierProducts(),
    getDbSupplierProductCount(),
    getDbSuppliers({ status: 'ACTIVE', take: 12 }),
    getCatalogProductCount(),
    getHomepageBanners(),
  ]);
  const suppliers = suppliersResult.items.map(dbSupplierToCard).sort((a, b) => b.productCount - a.productCount);
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const products = [
    ...supplierProducts.map((product) => dbProductToCard(product, supplierById.get(product.supplierId))),
    ...catalogProducts,
  ];
  const productCount = catalogProductCount + supplierProductCount;
  const displayCategories = collections;
  const displayProducts = products;
  const newProducts = displayProducts.slice(0, 4);
  const saleProducts = displayProducts.filter((product) => product.originalPrice && product.originalPrice > product.price).slice(0, 8);
  const articles = ARTICLES.slice(0, 3);

  return (
    <>
      <MarketplaceHero supplierCount={suppliersResult.total} productCount={productCount} />
      <CategoryRail collections={displayCategories} supplierProducts={supplierProducts} />
      <HomepageBanner banners={banners} />

      {/* New products */}
      <section id="new-products" className="scroll-mt-24 py-10 border-y border-[var(--glass-border)] bg-surface/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeader icon={Sparkles} title="Шинэ бараа" subtitle="Сүүлд нэмэгдсэн бүтээгдэхүүн" href="/products?mode=new" />
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory">
            {newProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--glass-border)] p-8 text-sm text-foreground-muted">
                Backend дээр бараа бүртгэгдээгүй байна.
              </div>
            ) : newProducts.map((product, i) => (
              <div key={product.id} className="min-w-[200px] max-w-[200px] sm:min-w-[220px] sm:max-w-[220px] snap-start">
                <ProductCard product={product} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sale products grid */}
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader icon={Flame} title="Хямдралтай бараа" subtitle="Backend дээр бүртгэлтэй хямдрал" href="/products?mode=sale" />
        {saleProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--glass-border)] bg-card p-8 text-sm text-foreground-muted">
            Одоогоор хямдралтай бараа бүртгэгдээгүй байна.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {saleProducts.map((product, i) => (
              <ProductCard key={product.id} product={{ ...product, badge: 'ХЯМДРАЛ' }} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Supplier spotlight */}
      <SupplierSection suppliers={suppliers} />

      <TrustStrip />

      {/* How it works */}
      <HowItWorksSection />

      {/* Trade banner */}
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12">
          <div className="absolute inset-0 gradient-mesh opacity-80" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,69,0,0.2) 0%, transparent 60%)' }} />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs font-semibold text-amber border border-amber/20 mb-4">
                🏢 Нийлүүлэгч болох
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-foreground mb-4 leading-tight">
                Таны бизнесийг онлайнд гаргаарай
              </h2>
              <p className="text-foreground-muted mb-6 leading-relaxed">
                shoptool.mn Marketplace дээр нийлүүлэгч болж, хэдэн мянган хэрэглэгчид хүр. Бүртгэл үнэгүй.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={merchantLoginHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-hover transition-colors shadow-lg shadow-brand/30">
                  Нийлүүлэгч болох <ArrowRight size={15} />
                </Link>
                <Link href={driverRegisterHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-foreground font-semibold text-sm transition-colors">
                  <Truck size={15} /> Жолооч болох
                </Link>
              </div>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-3">
              {[
                { stat: '₮0', label: 'Бүртгэлийн хураамж' },
                { stat: '10%', label: 'Комисс хувь' },
                { stat: '24ц', label: 'Хянан баталгаажуулалт' },
                { stat: '10,000+', label: 'Идэвхтэй худалдан авагч' },
              ].map(({ stat, label }) => (
                <div key={label} className="glass rounded-2xl p-5 text-center">
                  <div className="text-2xl font-black font-mono text-brand mb-1">{stat}</div>
                  <div className="text-xs text-foreground-muted">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How-to articles */}
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader icon={BookOpen} title="DIY Заавар" subtitle="Мэргэжилтнээс суралц" href="/how-to" />
        <div className="grid sm:grid-cols-3 gap-4">
          {articles.map((article) => (
            <Link key={article.slug} href={`/how-to/${article.slug}`} className="group block rounded-2xl bg-card border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-surface to-card flex items-center justify-center text-6xl">{article.emoji}</div>
              <div className="p-4">
                <h3 className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors mb-2 leading-snug">{article.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Clock size={11} /> {article.readTime} мин уншлага
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
