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
  name: string;
  slug: string;
  enabled: boolean;
  variants: Array<{ id: string; price: number; stockLevel: string; stockOnHand?: number }>;
}

export type TabFilter = 'pending' | 'active' | 'done';
