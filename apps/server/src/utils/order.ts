export interface CartItemForOrder {
  productId: string;
  supplierId: string;
  qty: number;
  price: number;
}

export interface CartForOrder {
  items: CartItemForOrder[];
}

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export function splitOrderBySupplier(cart: CartForOrder) {
  const groups = new Map<string, { supplierId: string; items: CartItemForOrder[]; subtotal: number }>();
  for (const item of cart.items) {
    const group = groups.get(item.supplierId) ?? { supplierId: item.supplierId, items: [], subtotal: 0 };
    group.items.push(item);
    group.subtotal += item.qty * item.price;
    groups.set(item.supplierId, group);
  }
  return Array.from(groups.values());
}

export function calculateCommission(amount: number, rate = 0.1) {
  const commission = Math.round(amount * rate);
  return {
    commission,
    supplierPayout: amount - commission,
  };
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return transitions[from]?.includes(to) ?? false;
}
