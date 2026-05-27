export enum OrderStatus {
  PENDING = 'PENDING',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  DRIVER_AT_STORE = 'DRIVER_AT_STORE',
  PICKED_UP = 'PICKED_UP',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface ProductOption {
  id: string;
  name: string;
  code: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  priceWithTax: number;
  currencyCode: string;
  stockLevel: string;
  options: ProductOption[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  featuredAsset?: { preview: string };
  parent?: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset: { preview: string };
  variants: ProductVariant[];
  collections: Collection[];
  supplierId?: string;
  supplierName?: string;
  category?: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface Address {
  id: string;
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province?: string;
  postalCode: string;
  country: { code: string; name: string };
  defaultShippingAddress?: boolean;
  defaultBillingAddress?: boolean;
}

export interface OrderLine {
  id: string;
  quantity: number;
  linePriceWithTax: number;
  productVariant: ProductVariant;
  featuredAsset?: { preview: string };
}

export interface Order {
  id: string;
  code: string;
  state: string;
  status?: OrderStatus;
  total: number;
  totalWithTax: number;
  lines: OrderLine[];
  shippingAddress?: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
  addresses: Address[];
}

export interface Supplier {
  id: string;
  name: string;
  businessName?: string;
  slug: string;
  description: string;
  logo?: string;
  banner?: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  deliveryTime: string;
  minOrderAmount: number;
  phone?: string;
  district?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export type VehicleType = 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phone: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  vehicleModel: string;
  rating: number;
  totalDeliveries: number;
  todayEarnings: number;
  totalEarnings: number;
  isOnline: boolean;
  currentLat?: number;
  currentLng?: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  supplierId: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  unit?: string;
}

export interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  supplierSlug?: string;
  supplierDistrict?: string;
  supplierLat?: number;
  supplierLng?: number;
  items: CartItem[];
  subtotal: number;
}

export interface DeliveryStop {
  supplierId: string;
  supplierName: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  pickedUp?: boolean;
}

export interface DeliveryRequest {
  id: string;
  orderId: string;
  pickupStops: DeliveryStop[];
  dropoff: {
    customerName: string;
    phone: string;
    address: string;
    district: string;
    khoroo?: string;
    lat: number;
    lng: number;
  };
  distanceKm: number;
  estimatedMinutes: number;
  stopsCount: number;
  fee: number;
  status: OrderStatus;
  expiresAt: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  fee: number;
  distance: number;
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  estimatedTime: number;
}

export interface SupplierDashboard {
  pendingOrders: number;
  todayRevenue: number;
  totalRevenue: number;
  totalProducts: number;
  recentOrders: Order[];
}

export type AuthResult =
  | Customer
  | { errorCode: string; message: string };

export interface PaginatedList<T> {
  items: T[];
  totalItems: number;
}
