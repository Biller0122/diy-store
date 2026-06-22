export type MarketplaceProduct = {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  image?: string | null;
  price: number;
  originalPrice?: number;
  priceIsMinorUnit?: boolean;
  badge?: 'ТОП' | 'ШИНЭ' | 'ХЯМДРАЛ' | 'ДУУССАН';
  inStock?: boolean;
  supplierName?: string;
};

export type MarketplaceSupplier = {
  id: string;
  name: string;
  slug: string;
  rating: number;
  reviewCount: number;
  district: string;
  productCount: number;
  isOpen: boolean;
  deliveryTime: string;
};

export type MarketplaceCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  productCount: number;
};

export type HomepageBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imageUrl?: string | null;
  accentColor?: string | null;
};

export const CATEGORY_ICONS = ['🔨', '🪵', '⚡', '🎨', '🛁', '🔩', '🏗️', '🧰', '💡', '🚪', '🧱', '📦'];

export const HOW_IT_WORKS = [
  { icon: '🛒', title: 'Бараа сонго', desc: 'Нийлүүлэгчийн барааг хайж сагсандаа нэмнэ' },
  { icon: '📦', title: 'Захиалга өг', desc: 'Олон дэлгүүрийн барааг нэг дор баталгаажуулна' },
  { icon: '🏍️', title: 'Жолооч авна', desc: 'Ойролцоох хүргэлтийн жолооч захиалгыг авна' },
  { icon: '📍', title: 'Хянах', desc: 'Захиалгын явцыг апп дээрээс шууд харна' },
];

export const DIY_GUIDES = [
  { emoji: '🎨', title: 'Өрөө будахад хэрэгтэй хэмжээг тооцох', readTime: '4 мин', query: 'будаг' },
  { emoji: '🧱', title: 'Плита, цемент сонгох хурдан зөвлөмж', readTime: '5 мин', query: 'цемент' },
  { emoji: '💡', title: 'Гэрэлтүүлгээ аюулгүй шинэчлэх', readTime: '3 мин', query: 'LED' },
];

export function formatPrice(price: number) {
  return '₮' + Math.round(price / 100).toLocaleString('mn-MN');
}

export function formatProductPrice(product: Pick<MarketplaceProduct, 'price' | 'priceIsMinorUnit'>) {
  const value = product.priceIsMinorUnit === false ? product.price : Math.round(product.price / 100);
  return '₮' + value.toLocaleString('mn-MN');
}

export type CategoryLike = {
  name?: string | null;
  slug?: string | null;
  children?: Array<{ name?: string | null; slug?: string | null }>;
};

export function normalizeCategory(value?: string | null) {
  return (value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[,&/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function supplierProductMatchesCategory(product: { category?: string | null }, category: CategoryLike, includeChildren = false) {
  const productCategory = normalizeCategory(product.category);
  if (!productCategory) return false;

  const categories = includeChildren ? [category, ...(category.children ?? [])] : [category];
  const keys = categories.flatMap((item) => [normalizeCategory(item.slug), normalizeCategory(item.name)]).filter(Boolean);
  return keys.some((key) => key === productCategory || key.includes(productCategory) || productCategory.includes(key));
}

export function mapSearchProduct(item: any, index = 0): MarketplaceProduct {
  return {
    id: item.productId,
    variantId: item.productVariantId,
    name: item.productName,
    slug: item.slug,
    image: item.productAsset?.preview,
    price: item.priceWithTax?.value ?? 0,
    priceIsMinorUnit: true,
    badge: index === 0 ? 'ТОП' : index < 4 ? 'ШИНЭ' : undefined,
    inStock: item.inStock !== false,
  };
}

export function mapProductListItem(item: any, index = 0): MarketplaceProduct {
  const variant = item.variants?.[0];
  return {
    id: item.id,
    variantId: variant?.id ?? item.id,
    name: item.name,
    slug: item.slug,
    image: item.featuredAsset?.preview,
    price: variant?.priceWithTax ?? 0,
    priceIsMinorUnit: true,
    badge: index === 0 ? 'ТОП' : index < 4 ? 'ШИНЭ' : undefined,
    inStock: variant?.stockLevel !== 'OUT_OF_STOCK',
  };
}

export function mapSupplierProduct(item: any, index = 0): MarketplaceProduct {
  return {
    id: item.id,
    variantId: item.id,
    name: item.name,
    slug: item.slug,
    image: item.image,
    price: item.price ?? 0,
    originalPrice: item.originalPrice ?? undefined,
    priceIsMinorUnit: false,
    badge: index === 0 ? 'ТОП' : index < 4 ? 'ШИНЭ' : undefined,
    inStock: item.enabled !== false && (item.stock ?? 0) > 0,
    supplierName: item.supplierName,
  };
}

export function mapSupplier(item: any): MarketplaceSupplier {
  return {
    id: item.id,
    name: item.businessName,
    slug: item.slug,
    rating: item.rating || 5,
    reviewCount: item.reviewCount || 0,
    district: item.district || 'Улаанбаатар',
    productCount: item.productCount || 0,
    isOpen: item.isOpen !== false,
    deliveryTime: item.deliveryTime || '30-45 мин',
  };
}

export function mapSemanticProduct(item: any, index = 0): MarketplaceProduct {
  const isSupplierProduct = item.source === 'supplier';
  return {
    id: item.id,
    variantId: item.variantId ?? item.id,
    name: item.name,
    slug: item.slug,
    image: item.image,
    price: item.price ?? 0,
    priceIsMinorUnit: !isSupplierProduct,
    badge: index === 0 ? 'ТОП' : index < 4 ? 'ШИНЭ' : undefined,
    inStock: true,
  };
}

export function encodeRoutePart(value: string) {
  return encodeURIComponent(value);
}
