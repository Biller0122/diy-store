// Seed/demo data used by static admin screens. Live API hooks must not fall
// back to these values when the server is unavailable.

export interface AdminOrder {
  id: string;
  code: string;
  customer: { firstName: string; lastName: string; emailAddress: string; phoneNumber?: string } | null;
  state: string;
  total: number;
  totalWithTax: number;
  itemCount: number;
  paymentState: string;
  shippingState: string;
  createdAt: string;
  updatedAt: string;
  lines: AdminOrderLine[];
  shippingAddress?: { fullName?: string; streetLine1?: string; city?: string; countryCode?: string };
  payments?: { method: string; state: string; amount: number }[];
  customFields?: { note?: string; trackingNumber?: string };
}

export interface AdminOrderLine {
  id: string;
  quantity: number;
  unitPriceWithTax: number;
  productVariant: { id: string; name: string; sku: string; product: { name: string; featuredAsset?: { preview: string } } };
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  featuredAsset?: { preview: string };
  variants: { id: string; sku: string; priceWithTax: number; stockOnHand: number; stockLevel: string }[];
  collections: { id: string; name: string }[];
}

export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface AdminQuote {
  id: string;
  companyName: string;
  registerNo: string;
  contactName: string;
  phone: string;
  email: string;
  description: string;
  fileUrls: string[];
  status: 'NEW' | 'PROCESSING' | 'RESPONDED' | 'DONE';
  createdAt: string;
  response?: string;
}

// ─── Mock data ────────────────────────────────────────────────

const NOW = new Date();
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();

export const MOCK_ORDERS: AdminOrder[] = Array.from({ length: 24 }, (_, i) => ({
  id: `ord-${i + 1}`,
  code: `DIY-${String(10001 + i)}`,
  customer: {
    firstName: ['Болд', 'Ариун', 'Энхбаяр', 'Долгор', 'Батжаргал'][i % 5],
    lastName: ['Баяр', 'Гомбо', 'Дорж', 'Наран', 'Цогт'][i % 5],
    emailAddress: `user${i}@example.mn`,
    phoneNumber: `${88000000 + i * 111}`,
  },
  state: ['PaymentAuthorized', 'PaymentSettled', 'Shipped', 'Delivered', 'Cancelled'][i % 5],
  total: (15000 + i * 3700) * 100,
  totalWithTax: (16500 + i * 4000) * 100,
  itemCount: 1 + (i % 4),
  paymentState: i % 5 === 4 ? 'Refunded' : 'Settled',
  shippingState: ['Pending', 'Shipped', 'Delivered'][i % 3],
  createdAt: daysAgo(i % 30),
  updatedAt: daysAgo(i % 10),
  lines: [{
    id: `line-${i}`,
    quantity: 1 + (i % 3),
    unitPriceWithTax: (15000 + i * 2000) * 100,
    productVariant: {
      id: `var-${i}`,
      name: ['Makita 18V Өрөм', 'Bosch Тоос соруулагч', 'Dulux Будаг 4L', 'Stanley Иж', 'Philips LED'][i % 5],
      sku: `SKU-${1000 + i}`,
      product: {
        name: ['Makita 18V Өрөм DTD153', 'Bosch GAS 18V', 'Dulux EasyCare', 'Stanley 210pc Kit', 'Philips LED 100W'][i % 5],
        featuredAsset: undefined,
      },
    },
  }],
  shippingAddress: { fullName: `Хэрэглэгч ${i+1}`, streetLine1: 'Нарны зам 5', city: 'Улаанбаатар', countryCode: 'MN' },
  payments: [{ method: ['qpay','monpay','card'][i % 3], state: 'Settled', amount: (15000 + i * 3700) * 100 }],
}));

export const MOCK_PRODUCTS: AdminProduct[] = [
  { id: 'p1', name: 'Makita 18V Өрөм DTD153', slug: 'makita-drill', description: 'Мэргэжлийн өрөм', enabled: true, variants: [{ id: 'v1', sku: 'MAK-001', priceWithTax: 28990000, stockOnHand: 12, stockLevel: 'IN_STOCK' }], collections: [{ id: 'c1', name: 'Багаж хэрэгсэл' }] },
  { id: 'p2', name: 'Bosch GAS 18V Тоос соруулагч', slug: 'bosch-vacuum', description: 'Тоос соруулагч', enabled: true, variants: [{ id: 'v2', sku: 'BSH-001', priceWithTax: 45990000, stockOnHand: 3, stockLevel: 'IN_STOCK' }], collections: [{ id: 'c1', name: 'Багаж хэрэгсэл' }] },
  { id: 'p3', name: 'Dulux EasyCare 4L Будаг', slug: 'dulux-paint', description: 'Чанарын будаг', enabled: true, variants: [{ id: 'v3', sku: 'DLX-001', priceWithTax: 5990000, stockOnHand: 45, stockLevel: 'IN_STOCK' }], collections: [{ id: 'c2', name: 'Будаг' }] },
  { id: 'p4', name: 'Stanley 210-ширхэг Иж', slug: 'stanley-kit', description: 'Багажны иж', enabled: true, variants: [{ id: 'v4', sku: 'STL-001', priceWithTax: 18990000, stockOnHand: 8, stockLevel: 'IN_STOCK' }], collections: [{ id: 'c1', name: 'Багаж хэрэгсэл' }] },
  { id: 'p5', name: 'Philips LED 100W Чийдэн', slug: 'philips-led', description: 'LED чийдэн', enabled: true, variants: [{ id: 'v5', sku: 'PHL-001', priceWithTax: 1290000, stockOnHand: 2, stockLevel: 'IN_STOCK' }], collections: [{ id: 'c3', name: 'Гэрэлтүүлэг' }] },
  { id: 'p6', name: 'Grohe Смесь Краан', slug: 'grohe-tap', description: 'Краан', enabled: true, variants: [{ id: 'v6', sku: 'GRH-001', priceWithTax: 34990000, stockOnHand: 0, stockLevel: 'OUT_OF_STOCK' }], collections: [{ id: 'c4', name: 'Сантехник' }] },
  { id: 'p7', name: 'Quick-Step Шалны самбар', slug: 'quickstep-floor', description: 'Шал', enabled: false, variants: [{ id: 'v7', sku: 'QSP-001', priceWithTax: 8990000, stockOnHand: 17, stockLevel: 'IN_STOCK' }], collections: [{ id: 'c5', name: 'Шал' }] },
  { id: 'p8', name: 'Schneider Electric Самбар', slug: 'schneider-panel', description: 'Цахилгаан самбар', enabled: true, variants: [{ id: 'v8', sku: 'SCH-001', priceWithTax: 25990000, stockOnHand: 4, stockLevel: 'IN_STOCK' }], collections: [{ id: 'c6', name: 'Цахилгаан' }] },
];

export const MOCK_REVIEWS: AdminReview[] = [
  { id: 'r1', productId: 'p1', productName: 'Makita 18V Өрөм DTD153', customerName: 'Болд Б.', rating: 5, title: 'Гайхалтай өрөм!', body: 'Батарейны хугацаа урт, хүч сайн. Мэргэжлийн ажилчдад зориулсан бүтээгдэхүүн байна. Маш их сэтгэл ханамжтай байна.', status: 'PENDING', verifiedPurchase: true, helpfulCount: 3, createdAt: daysAgo(1) },
  { id: 'r2', productId: 'p3', productName: 'Dulux EasyCare 4L Будаг', customerName: 'Ариун Г.', rating: 4, title: 'Будаг сайхан', body: 'Будаг нааш цааш явдаггүй, чанарын сайн байна. Зөвхөн хурц үнэртэй байлаа.', status: 'PENDING', verifiedPurchase: true, helpfulCount: 1, createdAt: daysAgo(2) },
  { id: 'r3', productId: 'p2', productName: 'Bosch GAS 18V', customerName: 'Энхбаяр Д.', rating: 5, title: 'Top бараа', body: 'Хүч сайн, хөнгөн. Ажлын байранд маш тохиромжтой.', status: 'APPROVED', verifiedPurchase: false, helpfulCount: 7, createdAt: daysAgo(5) },
  { id: 'r4', productId: 'p5', productName: 'Philips LED Чийдэн', customerName: 'Долгор Н.', rating: 2, title: 'Хурдан гэмтсэн', body: 'Нэг сарын дотор гэмтсэн. Дахин авахгүй.', status: 'PENDING', verifiedPurchase: true, helpfulCount: 0, createdAt: daysAgo(3) },
  { id: 'r5', productId: 'p4', productName: 'Stanley Иж', customerName: 'Батжаргал Ц.', rating: 5, title: 'Дутагдалгүй иж', body: '210 ширхэг бүгд байна. Чанарын сайн материалаар хийсэн.', status: 'REJECTED', verifiedPurchase: false, helpfulCount: 2, createdAt: daysAgo(7) },
];

export const MOCK_QUOTES: AdminQuote[] = [
  { id: 'q1', companyName: 'Баянбүрд ХХК', registerNo: '1234567', contactName: 'Ц. Батэрдэнэ', phone: '99112233', email: 'info@bayanbuurd.mn', description: '200 ширхэг LED чийдэн, 50 ширхэг өрөм хэрэгтэй байна.', fileUrls: [], status: 'NEW', createdAt: daysAgo(0) },
  { id: 'q2', companyName: 'Монгол Барилга ХХК', registerNo: '7654321', contactName: 'Б. Гантулга', phone: '88445566', email: 'build@monbar.mn', description: 'Барилгын материал бөөнөөр авмаар байна.', fileUrls: [], status: 'PROCESSING', createdAt: daysAgo(3) },
  { id: 'q3', companyName: 'Оргил Трейд ХХК', registerNo: '9988776', contactName: 'Н. Оюунчимэг', phone: '77889900', email: 'trade@orgil.mn', description: 'Оффисын засвар, хана будах материал.', fileUrls: [], status: 'RESPONDED', createdAt: daysAgo(7), response: 'Үнийн санал илгээлээ.' },
];

// ─── Revenue mock (30 days) ───────────────────────────────────

export function getMockRevenueData() {
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(NOW.getTime() - (29 - i) * 86400000);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return {
      date: date.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' }),
      revenue: Math.round((isWeekend ? 400000 : 800000) + Math.random() * 600000),
      orders: Math.round((isWeekend ? 8 : 18) + Math.random() * 12),
    };
  });
}

export function getMockMetrics() {
  return {
    todayRevenue: 1_847_000,
    totalOrders: MOCK_ORDERS.length,
    newCustomers: 7,
    pendingOrders: MOCK_ORDERS.filter(o => o.state === 'PaymentAuthorized').length,
  };
}

export function getLowStockProducts() {
  return MOCK_PRODUCTS
    .filter(p => p.variants[0]?.stockOnHand <= 5)
    .map(p => ({ ...p, stock: p.variants[0]?.stockOnHand ?? 0 }));
}

export function getTopProducts() {
  return MOCK_PRODUCTS.slice(0, 5).map((p, i) => ({
    rank: i + 1,
    name: p.name,
    image: p.featuredAsset?.preview,
    sold: 120 - i * 18,
    revenue: (120 - i * 18) * (p.variants[0]?.priceWithTax ?? 0),
  }));
}
