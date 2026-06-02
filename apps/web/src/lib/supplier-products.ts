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
        description
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
      { revalidate: 0 },
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
      { revalidate: 0 },
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
      { revalidate: 0 },
    );
    return data.suppliers;
  } catch {
    return { items: [], total: 0 };
  }
}

export async function getDbSupplierProducts(supplierId?: string) {
  try {
    const data = await vendureShopFetch<{ supplierProducts: { items: DbSupplierProduct[] } }>(
      SUPPLIER_PRODUCTS_QUERY,
      { supplierId },
      { revalidate: 0 },
    );
    return data.supplierProducts.items;
  } catch {
    return [];
  }
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
    deliveryTime: supplier.deliveryEnabled ? '30-60 мин' : 'Pickup',
    isOpen: true,
    categories: [],
    phone: supplier.phone,
    address: supplier.address || '',
    lat: supplier.lat ?? 47.9185,
    lng: supplier.lng ?? 106.917,
  };
}

export function dbProductToCard(product: DbSupplierProduct, supplier?: Pick<SupplierCard, 'businessName' | 'slug' | 'district' | 'lat' | 'lng'>) {
  return {
    id: product.id,
    variantId: product.id,
    name: product.name,
    slug: product.slug,
    image: product.image ?? '',
    price: product.price,
    originalPrice: product.originalPrice ?? undefined,
    rating: 0,
    reviewCount: 0,
    badge: 'ШИНЭ' as const,
    inStock: product.enabled && product.stock > 0,
    supplierId: product.supplierId,
    supplierName: supplier?.businessName,
    supplierSlug: supplier?.slug,
    supplierDistrict: supplier?.district,
    supplierLat: supplier?.lat,
    supplierLng: supplier?.lng,
  };
}
