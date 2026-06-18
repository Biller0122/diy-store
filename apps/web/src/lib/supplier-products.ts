import type { SupplierCard } from './supplier-data';
import { vendureShopFetch } from './vendure';

export type DbSupplier = {
  id: string;
  businessName: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  ownerName: string;
  phone: string;
  email: string;
  address?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating: number;
  reviewCount: number;
  productCount: number;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  status?: string;
};

export type DbSupplierProduct = {
  id: string;
  supplierId: string;
  name: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  price: number;
  originalPrice?: number | null;
  stock: number;
  enabled: boolean;
};

const SUPPLIER_BY_SLUG_QUERY = `
  query SupplierBySlug($slug: String!) {
    supplierBySlug(slug: $slug) {
      id
      businessName
      slug
      logo
      description
      ownerName
      phone
      email
      address
      district
      lat
      lng
      rating
      reviewCount
      productCount
      pickupEnabled
      deliveryEnabled
      status
    }
  }
`;

const SUPPLIER_BY_ID_QUERY = `
  query Supplier($id: ID!) {
    supplier(id: $id) {
      id
      businessName
      slug
      logo
      description
      ownerName
      phone
      email
      address
      district
      lat
      lng
      rating
      reviewCount
      productCount
      pickupEnabled
      deliveryEnabled
      status
    }
  }
`;

const SUPPLIERS_QUERY = `
  query Suppliers($status: String, $take: Int, $skip: Int) {
    suppliers(status: $status, take: $take, skip: $skip) {
      items {
        id
        businessName
        slug
        logo
        description
        ownerName
        phone
        email
        address
        district
        lat
        lng
        rating
        reviewCount
        productCount
        pickupEnabled
        deliveryEnabled
        status
      }
      total
    }
  }
`;

const SUPPLIER_PRODUCTS_QUERY = `
  query SupplierProducts($supplierId: String) {
    supplierProducts(supplierId: $supplierId) {
      items {
        id
        supplierId
        name
        slug
        category
        image
        price
        originalPrice
        stock
        enabled
      }
      total
    }
  }
`;

export async function getDbSupplierBySlug(slug: string) {
  try {
    const data = await vendureShopFetch<{ supplierBySlug: DbSupplier | null }>(
      SUPPLIER_BY_SLUG_QUERY,
      { slug },
      { revalidate: 120 },
    );
    return data.supplierBySlug;
  } catch {
    return null;
  }
}

export async function getDbSupplierById(id: string) {
  try {
    const data = await vendureShopFetch<{ supplier: DbSupplier | null }>(
      SUPPLIER_BY_ID_QUERY,
      { id },
      { revalidate: 120 },
    );
    return data.supplier;
  } catch {
    return null;
  }
}

export async function getDbSuppliers(options: { status?: string; take?: number; skip?: number } = {}) {
  try {
    const data = await vendureShopFetch<{ suppliers: { items: DbSupplier[]; total: number } }>(
      SUPPLIERS_QUERY,
      { status: options.status, take: options.take ?? 24, skip: options.skip ?? 0 },
      { revalidate: 120 },
    );
    return data.suppliers;
  } catch {
    return { items: [], total: 0 };
  }
}

export async function getDbSupplierProducts(supplierId?: string) {
  try {
    const data = await vendureShopFetch<{ supplierProducts: { items: DbSupplierProduct[]; total: number } }>(
      SUPPLIER_PRODUCTS_QUERY,
      { supplierId },
      { revalidate: 120 },
    );
    return data.supplierProducts.items;
  } catch {
    return [];
  }
}

export async function getDbSupplierProductCount(supplierId?: string) {
  try {
    const data = await vendureShopFetch<{ supplierProducts: { total: number } }>(
      SUPPLIER_PRODUCTS_QUERY,
      { supplierId },
      { revalidate: 120 },
    );
    return data.supplierProducts.total ?? 0;
  } catch {
    return 0;
  }
}

type CategoryLike = {
  name: string;
  slug: string;
  children?: Array<{ name: string; slug: string }>;
};

function normalizeCategory(value?: string | null) {
  return (value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[,&/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Барааны нэр/ангилалаас түлхүүр үг уншиж, тохирох коллекцид автоматаар онооно.
// Түлхүүр (key) нь коллекцийн нэр/slug дотор багтах ёстой токен; утга нь барааны
// нэр/ангилалд хайх trigger үгс. Жишээ: "гагнуурын аппарат" → "багаж" коллекц.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  багаж: [
    'багаж', 'tool', 'өрөм', 'перфоратор', 'дрель', 'гагнуур', 'гагнуурын', 'аппарат',
    'зүсэгч', 'зүсэх', 'хайч', 'шлифлэгч', 'grinder', 'өнгөлгөө', 'түлхүүр', 'болт',
    'шураг', 'эрэг', 'диск', 'plasma', 'плазм', 'welder', 'welding', 'компрессор',
    'генератор', 'болгон', 'хүнд ажилтны', 'cleaner',
  ],
  сантехник: [
    'сантехник', 'ус ', 'хоолой', 'цорго', 'холигч', 'угаалтуур', 'суултуур', 'шүршүүр',
    'ванн', 'клапан', 'насос', 'шламбур', 'смеситель',
  ],
  халаагуур: ['халаагуур', 'халаалт', 'радиатор', 'бойлер', 'зуух', 'дулаан', 'конвектор'],
  цахилгаан: [
    'цахилгаан', 'кабель', 'утас', 'розетк', 'залгуур', 'автомат', 'щит', 'led', 'чийдэн',
    'лампа', 'выключатель', 'салаа', 'розетка',
  ],
  обой: ['обой', 'wallpaper', 'хуулга', 'наалт'],
  будаг: ['будаг', 'paint', 'лак', 'эмульс', 'грунт', 'праймер', 'шпатл', 'шпакл'],
  цемент: ['цемент', 'cement', 'бетон', 'зуурмаг', 'шохой', 'гипс', 'гипсэн', 'хольц'],
  төмөр: ['төмөр', 'арматур', 'rebar', 'металл', 'профиль', 'хийц'],
  мод: ['банз', 'хөрөө', 'фанер', 'osb', 'дүнз', 'тавц', 'модон'],
  тоосго: ['тоосго', 'блок', 'керамзит'],
  дээвэр: ['дээвэр', 'фасад', 'салхивч', 'ондулин', 'профнастил', 'шифер', 'хучилт'],
  засал: ['засал', 'чимэглэл', 'декор', 'плинтус', 'карниз', 'хивс'],
  шал: ['ламинат', 'паркет', 'линолеум', 'кафель', 'плитк'],
};

export function supplierProductMatchesCategory(
  product: Pick<DbSupplierProduct, 'category' | 'name'>,
  category: CategoryLike,
  includeChildren = false,
) {
  const productCategory = normalizeCategory(product.category);
  const productText = normalizeCategory(`${product.category ?? ''} ${product.name ?? ''}`);

  const categories = includeChildren ? [category, ...(category.children ?? [])] : [category];
  const keys = categories.flatMap((item) => [normalizeCategory(item.slug), normalizeCategory(item.name)]).filter(Boolean);

  // 1) Шууд тохирол — барааны хадгалсан ангилал коллекцийн нэр/slug-тай таарвал.
  if (productCategory && keys.some((key) => key === productCategory || key.includes(productCategory) || productCategory.includes(key))) {
    return true;
  }

  // 2) Түлхүүр үгийн тохирол — барааны нэр/ангилалаас тааруулна.
  const categoryText = keys.join(' ');
  for (const [token, triggers] of Object.entries(CATEGORY_KEYWORDS)) {
    if (!categoryText.includes(token)) continue;
    if (triggers.some((trigger) => productText.includes(normalizeCategory(trigger)))) return true;
  }
  return false;
}

export function getSupplierProductCategoryCount(products: DbSupplierProduct[], category: CategoryLike, includeChildren = false) {
  return products.filter((product) => product.enabled && supplierProductMatchesCategory(product, category, includeChildren)).length;
}

export function dbSupplierToCard(supplier: DbSupplier): SupplierCard {
  return {
    id: supplier.id,
    businessName: supplier.businessName,
    slug: supplier.slug,
    logo: supplier.logo ?? undefined,
    description: supplier.description || `${supplier.businessName} нийлүүлэгчийн дэлгүүр`,
    district: supplier.district || 'Улаанбаатар',
    rating: supplier.rating || 0,
    reviewCount: supplier.reviewCount || 0,
    productCount: supplier.productCount || 0,
    deliveryTime: supplier.deliveryEnabled ? '30-60 мин' : 'Хүргэлт тохиролцоно',
    isOpen: true,
    categories: [],
    phone: supplier.phone,
    address: supplier.address || '',
    lat: supplier.lat ?? 47.9185,
    lng: supplier.lng ?? 106.917,
  };
}

export function dbProductToCard(
  product: DbSupplierProduct,
  supplier?: {
    businessName?: string | null;
    slug?: string | null;
    district?: string | null;
    lat?: number | null;
    lng?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
  },
) {
  return {
    id: product.id,
    variantId: product.id,
    name: product.name,
    slug: product.slug,
    image: product.image ?? '',
    price: product.price,
    originalPrice: product.originalPrice ?? undefined,
    rating: supplier?.rating ?? 0,
    reviewCount: supplier?.reviewCount ?? 0,
    badge: 'ШИНЭ' as const,
    inStock: product.enabled && product.stock > 0,
    supplierId: product.supplierId,
    supplierName: supplier?.businessName ?? undefined,
    supplierSlug: supplier?.slug ?? undefined,
    supplierDistrict: supplier?.district ?? undefined,
    supplierLat: supplier?.lat ?? undefined,
    supplierLng: supplier?.lng ?? undefined,
    stock: product.stock,
  };
}
