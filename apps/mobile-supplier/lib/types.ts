export type OrderStatus =
  | 'PaymentAuthorized'
  | 'PaymentSettled'
  | 'PartiallyShipped'
  | 'Shipped'
  | 'PartiallyDelivered'
  | 'Delivered'
  | 'Cancelled';

export interface SupplierOrder {
  id: string;
  code: string;
  state: OrderStatus;
  total: number;
  createdAt: string;
  shippingAddress?: { streetLine1: string; city: string };
  lines: Array<{
    quantity: number;
    productVariant: { name: string; product: { name: string } };
  }>;
}

export interface SupplierProduct {
  id: string;
  supplierId?: string;
  name: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  enabled: boolean;
  price: number;
  originalPrice?: number | null;
  stock: number;
  createdAt?: string;
  updatedAt?: string;
  variants?: Array<{ id: string; price: number; stockLevel: string; stockOnHand?: number }>;
}

export type TabFilter = 'pending' | 'active' | 'done';
