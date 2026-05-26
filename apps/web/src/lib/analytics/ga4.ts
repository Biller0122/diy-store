'use client';

// ─── Types ────────────────────────────────────────────────────

interface GtagItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// ─── Helpers ──────────────────────────────────────────────────

const IS_MOCK = !process.env.NEXT_PUBLIC_GA4_ID;

function gtag(event: string, params: Record<string, any>) {
  if (IS_MOCK) {
    // Silent in production mock mode; dev console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GA4 mock] ${event}`, params);
    }
    return;
  }
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, params);
  }
}

function toItem(product: {
  id: string;
  variantId?: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
  qty?: number;
}): GtagItem {
  return {
    item_id: product.variantId ?? product.id,
    item_name: product.name,
    item_category: product.category,
    item_brand: product.brand,
    price: product.price / 100,
    quantity: product.qty ?? 1,
    currency: 'MNT',
  };
}

// ─── Ecommerce events ─────────────────────────────────────────

export function trackViewItem(product: {
  id: string;
  variantId?: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}) {
  gtag('view_item', {
    currency: 'MNT',
    value: product.price / 100,
    items: [toItem(product)],
  });
}

export function trackAddToCart(product: {
  id: string;
  variantId?: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
  qty?: number;
}) {
  const qty = product.qty ?? 1;
  gtag('add_to_cart', {
    currency: 'MNT',
    value: (product.price * qty) / 100,
    items: [toItem({ ...product, qty })],
  });
}

export function trackRemoveFromCart(product: {
  id: string;
  variantId?: string;
  name: string;
  price: number;
  qty?: number;
}) {
  gtag('remove_from_cart', {
    currency: 'MNT',
    value: (product.price * (product.qty ?? 1)) / 100,
    items: [toItem(product)],
  });
}

export function trackViewCart(items: {
  id: string;
  variantId?: string;
  name: string;
  price: number;
  qty: number;
}[], total: number) {
  gtag('view_cart', {
    currency: 'MNT',
    value: total / 100,
    items: items.map(toItem),
  });
}

export function trackBeginCheckout(items: {
  id: string;
  variantId?: string;
  name: string;
  price: number;
  qty: number;
}[], total: number) {
  gtag('begin_checkout', {
    currency: 'MNT',
    value: total / 100,
    items: items.map(toItem),
  });
}

export function trackAddPaymentInfo(paymentMethod: 'QPay' | 'MonPay' | 'Card') {
  gtag('add_payment_info', {
    currency: 'MNT',
    payment_type: paymentMethod,
  });
}

export function trackPurchase(order: {
  id: string;
  total: number;
  items: {
    variantId: string;
    name: string;
    price: number;
    qty: number;
  }[];
}) {
  gtag('purchase', {
    transaction_id: order.id,
    currency: 'MNT',
    value: order.total / 100,
    items: order.items.map((item) => toItem({ id: item.variantId, ...item })),
  });
}

export function trackSearch(query: string, resultCount?: number) {
  gtag('search', {
    search_term: query,
    ...(resultCount !== undefined ? { result_count: resultCount } : {}),
  });
}

export function trackViewItemList(listName: string, products: {
  id: string;
  variantId?: string;
  name: string;
  price: number;
}[]) {
  gtag('view_item_list', {
    item_list_name: listName,
    items: products.map((p, i) => ({ ...toItem(p), index: i })),
  });
}

export function trackSelectItem(listName: string, product: {
  id: string;
  variantId?: string;
  name: string;
  price: number;
}) {
  gtag('select_item', {
    item_list_name: listName,
    items: [toItem(product)],
  });
}
