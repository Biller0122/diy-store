import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Flame, Sparkles, Star, Store, Truck, MapPin, CheckCircle2 } from 'lucide-react';
import { vendureShopFetch, type VendureCollection } from '@/lib/vendure';
import { TrustStrip } from '@/components/ui/TrustStrip';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { ProductCard, type ProductCardData } from '@/components/ui/ProductCard';
import { MOCK_SUPPLIERS } from '@/lib/supplier-data';

// ─── Data fetching ────────────────────────────────────────────

const COLLECTIONS_QUERY = `
  query Collections {
    collections(options: { take: 12 }) {
      items {
        id name slug
        customFields { icon }
        productVariants(options: { take: 1 }) { totalItems }
      }
    }
  }
`;

const FEATURED_QUERY = `
  query Featured {
    search(input: { take: 8, sort: { name: ASC } }) {
      items {
        productId productVariantId productName slug
        productAsset { preview }
        priceWithTax { ... on SinglePrice { value } }
      }
    }
  }
`;

async function getCollections(): Promise<VendureCollection[]> {
  try {
    const data = await vendureShopFetch<{ collections: { items: VendureCollection[] } }>(COLLECTIONS_QUERY);
    return data.collections?.items ?? [];
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
      rating: 4 + Math.random() * 0.9,
      reviewCount: Math.floor(20 + Math.random() * 200),
      badge: i === 0 ? 'ТОП' : i < 3 ? 'ШИНЭ' : undefined,
      inStock: true,
    })) as ProductCardData[];
  } catch {
    return MOCK_PRODUCTS;
  }
}

// ─── Mock data ────────────────────────────────────────────────

const MOCK_CATEGORIES = [
  { id: '1', name: 'Багаж хэрэгсэл', slug: 'bagaj', customFields: { icon: '🔧' } },
  { id: '2', name: 'Барилгын материал', slug: 'barilga', customFields: { icon: '🧱' } },
  { id: '3', name: 'Сантехник', slug: 'santekhnik', customFields: { icon: '🚿' } },
  { id: '4', name: 'Цахилгаан', slug: 'tsakhilgaan', customFields: { icon: '⚡' } },
  { id: '5', name: 'Будаг ба засвар', slug: 'budag', customFields: { icon: '🎨' } },
  { id: '6', name: 'Гэрэлтүүлэг', slug: 'gerel', customFields: { icon: '💡' } },
  { id: '7', name: 'Хаалга, цонх', slug: 'khaalga', customFields: { icon: '🚪' } },
  { id: '8', name: 'Шал ба хана', slug: 'shal', customFields: { icon: '🏠' } },
] as VendureCollection[];

const MOCK_PRODUCTS: ProductCardData[] = [
  { id: 'p1', variantId: 'v1', name: 'Makita 18V Өрөм DTD153', slug: 'makita-drill', image: '', price: 28990000, rating: 4.9, reviewCount: 247, badge: 'ТОП', inStock: true },
  { id: 'p2', variantId: 'v2', name: 'Bosch GAS 18V Тоос соруулагч', slug: 'bosch-vacuum', image: '', price: 45990000, originalPrice: 59990000, rating: 4.7, reviewCount: 183, badge: 'ХЯМДРАЛ', inStock: true },
  { id: 'p3', variantId: 'v3', name: 'Dulux EasyCare 4L Будаг', slug: 'dulux-paint', image: '', price: 5990000, rating: 4.5, reviewCount: 94, badge: 'ШИНЭ', inStock: true },
  { id: 'p4', variantId: 'v4', name: 'Stanley 210-ширхэг Багажны иж', slug: 'stanley-kit', image: '', price: 18990000, rating: 4.8, reviewCount: 312, inStock: true },
  { id: 'p5', variantId: 'v5', name: 'Philips LED 100W Чийдэн 6ш', slug: 'philips-led', image: '', price: 1290000, originalPrice: 1590000, rating: 4.6, reviewCount: 528, badge: 'ХЯМДРАЛ', inStock: true },
  { id: 'p6', variantId: 'v6', name: 'Grohe Смесь Краан', slug: 'grohe-tap', image: '', price: 34990000, rating: 4.9, reviewCount: 77, badge: 'ШИНЭ', inStock: true },
  { id: 'p7', variantId: 'v7', name: 'Quick-Step Parquet Шалны самбар', slug: 'quickstep-floor', image: '', price: 8990000, rating: 4.4, reviewCount: 156, inStock: false },
  { id: 'p8', variantId: 'v8', name: 'Schneider Electric Самбар', slug: 'schneider-panel', image: '', price: 25990000, originalPrice: 32990000, rating: 4.7, reviewCount: 89, badge: 'ХЯМДРАЛ', inStock: true },
];

const HOW_TO = [
  { title: 'Өрөөний будгийг хэрхэн сонгох вэ?', time: '5 мин', emoji: '🎨', slug: 'paint-guide' },
  { title: 'Гэртээ LED гэрэлтүүлэг суурилуулах', time: '8 мин', emoji: '💡', slug: 'led-install' },
  { title: 'Угаалтуур яаж солих — алхам алхмаар', time: '12 мин', emoji: '🚿', slug: 'faucet-guide' },
];

const HOW_IT_WORKS = [
  { step: 1, icon: '🛒', title: 'Бараа сонго', desc: 'Дурын нийлүүлэгчийн дэлгүүрээс хайж олоорой' },
  { step: 2, icon: '📦', title: 'Захиалга өг', desc: 'Олон нийлүүлэгчийн захиалгыг нэг дор хийнэ' },
  { step: 3, icon: '🏍️', title: 'Жолооч авна', desc: 'Хамгийн ойр жолооч таны захиалгыг хүлээж авна' },
  { step: 4, icon: '📍', title: 'Хүргэлт хянах', desc: 'Жолоочийн байршлыг шууд хянана уу' },
];

// ─── Components ───────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, subtitle, href,
}: {
  icon: React.ElementType; title: string; subtitle?: string; href?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon size={18} className="text-brand" />
          <h2 className="font-display font-bold text-2xl text-foreground">{title}</h2>
        </div>
        {subtitle && <p className="text-foreground-muted text-sm">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-sm text-brand hover:text-brand-light transition-colors font-medium">
          Бүгдийг харах <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

function MarketplaceHero() {
  return (
    <section className="relative overflow-hidden py-20 px-4">
      <div className="absolute inset-0 gradient-mesh opacity-60" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(255,69,0,0.15) 0%, transparent 60%)' }} />
      <div className="relative max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-xs font-semibold text-brand border border-brand/20 mb-6">
          <Sparkles size={12} /> 100+ нийлүүлэгч нэг платформд
        </div>
        <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl text-foreground leading-tight mb-6">
          Барилгын материал.{' '}
          <span className="text-brand">Хүргэлттэй.</span>
        </h1>
        <p className="text-xl text-foreground-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          100+ нийлүүлэгчийн бараа. Шуурхай хүргэлт. Нэг сагсаар олон дэлгүүрээс захиалаарай.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/suppliers" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-brand text-white font-bold text-base hover:bg-brand-hover transition-all shadow-xl shadow-brand/30 hover:scale-105">
            <Store size={18} /> Нийлүүлэгчид үзэх
          </Link>
          <Link href="/category" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl glass glass-hover text-foreground font-bold text-base hover:scale-105 transition-all">
            Ангилал харах <ArrowRight size={16} />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-14">
          {[
            { value: '100+', label: 'Нийлүүлэгч' },
            { value: '10,000+', label: 'Бүтээгдэхүүн' },
            { value: '30 мин', label: 'Дундаж хүргэлт' },
          ].map(({ value, label }) => (
            <div key={label} className="glass rounded-2xl p-4 text-center">
              <p className="text-2xl font-black font-mono text-brand">{value}</p>
              <p className="text-xs text-foreground-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupplierSection() {
  const featured = MOCK_SUPPLIERS.filter((s) => s.isOpen).slice(0, 4);
  return (
    <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6">
      <SectionHeader icon={Store} title="Онцлох нийлүүлэгчид" subtitle="Найдвартай нийлүүлэгчдээс шууд захиалаарай" href="/suppliers" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featured.map((sup) => (
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
              <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
                <span className="text-white text-sm">🔨</span>
              </div>
              <span className="font-display font-black text-lg text-foreground">DIY<span className="text-brand">Store</span></span>
            </div>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Монголын хамгийн том DIY маркетплейс. 100+ нийлүүлэгч, шуурхай хүргэлт.
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
                    <Link href="#" className="text-sm text-foreground-muted hover:text-foreground transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--glass-border)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground-muted">© 2025 DIY Store Marketplace. Бүх эрх хуулиар хамгаалагдсан.</p>
          <div className="flex items-center gap-4 text-xs text-foreground-muted">
            <Link href="#" className="hover:text-foreground transition-colors">Нууцлалын бодлого</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Үйлчилгээний нөхцөл</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default async function HomePage() {
  const [collections, products] = await Promise.all([getCollections(), getFeaturedProducts()]);
  const displayCategories = collections.length > 0 ? collections : MOCK_CATEGORIES;
  const displayProducts = products.length > 0 ? products : MOCK_PRODUCTS;
  const newProducts = displayProducts.slice(0, 4);
  const saleProducts = displayProducts.slice(4);

  return (
    <>
      <MarketplaceHero />
      <TrustStrip />

      {/* Supplier spotlight */}
      <SupplierSection />

      {/* Categories */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader icon={Sparkles} title="Онцлох ангилал" subtitle="Шаардлагатай бараагаа хурдан олоорой" href="/category" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {displayCategories.slice(0, 12).map((cat, i) => (
            <CategoryCard key={cat.id} name={cat.name} slug={cat.slug} icon={cat.customFields?.icon ?? '📦'} index={i} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <HowItWorksSection />

      {/* New products */}
      <section className="py-10 border-y border-[var(--glass-border)] bg-surface/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeader icon={Sparkles} title="Шинэ бараа" subtitle="Сүүлд нэмэгдсэн бүтээгдэхүүн" href="/category" />
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory">
            {newProducts.map((product, i) => (
              <div key={product.id} className="min-w-[200px] max-w-[200px] sm:min-w-[220px] sm:max-w-[220px] snap-start">
                <ProductCard product={product} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

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
                DIY Store Marketplace дээр нийлүүлэгч болж, хэдэн мянган хэрэглэгчид хүр. Бүртгэл үнэгүй.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/supplier/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-hover transition-colors shadow-lg shadow-brand/30">
                  Нийлүүлэгч болох <ArrowRight size={15} />
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

      {/* Sale products grid */}
      {saleProducts.length > 0 && (
        <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeader icon={Flame} title="Хямдралтай бараа" subtitle="Хугацаат санал — хурдан авна уу" href="/sale" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {saleProducts.map((product, i) => (
              <ProductCard key={product.id} product={{ ...product, badge: 'ХЯМДРАЛ' }} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* How-to articles */}
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader icon={BookOpen} title="DIY Заавар" subtitle="Мэргэжилтнээс суралц" href="/guides" />
        <div className="grid sm:grid-cols-3 gap-4">
          {HOW_TO.map((article) => (
            <Link key={article.slug} href={`/guides/${article.slug}`} className="group block rounded-2xl bg-card border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-surface to-card flex items-center justify-center text-6xl">{article.emoji}</div>
              <div className="p-4">
                <h3 className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors mb-2 leading-snug">{article.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Clock size={11} /> {article.time} уншлага
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
