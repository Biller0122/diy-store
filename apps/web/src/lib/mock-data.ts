export interface MockSupplier {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  location: string;
  phone: string;
  deliveryTime: string;
  minOrder: number;
  categories: string[];
  verified: boolean;
}

export interface MockProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  category: string;
  supplierId: string;
  supplierName: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  unit: string;
}

export interface MockDriver {
  id: string;
  name: string;
  phone: string;
  vehicleType: 'MOTORCYCLE' | 'CAR' | 'VAN';
  vehiclePlate: string;
  status: 'DELIVERING' | 'ONLINE' | 'OFFLINE';
  lat: number;
  lng: number;
  rating: number;
  completedDeliveries: number;
  currentOrder?: string;
  eta?: number;
}

export interface MockOrder {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  total: number;
  itemCount: number;
  supplierName: string;
  deliveryAddress: string;
}

export const MOCK_SUPPLIERS: MockSupplier[] = [
  {
    id: 'sup-1', slug: 'gantso-bariltgiin-material',
    name: 'Ганцоо барилгын материал',
    description: 'Барилгын материалын тэргүүлэгч нийлүүлэгч. 20 жилийн туршлагатай.',
    logo: 'https://picsum.photos/seed/sup1/80/80',
    coverImage: 'https://picsum.photos/seed/sup1cover/800/300',
    rating: 4.8, reviewCount: 312, productCount: 145, location: 'Баянзүрх дүүрэг',
    phone: '9911-0011', deliveryTime: '1-2 хоног', minOrder: 5_000_000,
    categories: ['Барилга', 'Цемент', 'Тоосго'],
    verified: true,
  },
  {
    id: 'sup-2', slug: 'tomor-zah',
    name: 'Төмөр зах',
    description: 'Төмрийн материал, хоолой, профиль. Өргөн сонголт, хямд үнэ.',
    logo: 'https://picsum.photos/seed/sup2/80/80',
    coverImage: 'https://picsum.photos/seed/sup2cover/800/300',
    rating: 4.6, reviewCount: 187, productCount: 89, location: 'Сүхбаатар дүүрэг',
    phone: '9922-0022', deliveryTime: '2-3 хоног', minOrder: 3_000_000,
    categories: ['Төмөр', 'Хоолой', 'Профиль'],
    verified: true,
  },
  {
    id: 'sup-3', slug: 'budag-market',
    name: 'Будаг маркет',
    description: 'Дотоод, гадаад брэндийн будаг, лак, шингэлэгч бүтээгдэхүүн.',
    logo: 'https://picsum.photos/seed/sup3/80/80',
    coverImage: 'https://picsum.photos/seed/sup3cover/800/300',
    rating: 4.7, reviewCount: 224, productCount: 210, location: 'Баянгол дүүрэг',
    phone: '9933-0033', deliveryTime: '1 хоног', minOrder: 2_000_000,
    categories: ['Будаг', 'Лак', 'Шингэлэгч'],
    verified: true,
  },
  {
    id: 'sup-4', slug: 'santekhnk-pro',
    name: 'Сантехник про',
    description: 'Усан хангамж, ариутгалын байгууламжийн тоног төхөөрөмж.',
    logo: 'https://picsum.photos/seed/sup4/80/80',
    coverImage: 'https://picsum.photos/seed/sup4cover/800/300',
    rating: 4.5, reviewCount: 143, productCount: 178, location: 'Хан-Уул дүүрэг',
    phone: '9944-0044', deliveryTime: '1-3 хоног', minOrder: 1_500_000,
    categories: ['Сантехник', 'Усан хангамж', 'Ванн'],
    verified: true,
  },
  {
    id: 'sup-5', slug: 'tsakhilgaan-tool',
    name: 'Цахилгаан тоол',
    description: 'Цахилгааны кабель, розетка, шилжүүлэгч, гэрэл.',
    logo: 'https://picsum.photos/seed/sup5/80/80',
    coverImage: 'https://picsum.photos/seed/sup5cover/800/300',
    rating: 4.4, reviewCount: 98, productCount: 320, location: 'Чингэлтэй дүүрэг',
    phone: '9955-0055', deliveryTime: '1-2 хоног', minOrder: 1_000_000,
    categories: ['Цахилгаан', 'Кабель', 'Гэрэл'],
    verified: false,
  },
  {
    id: 'sup-6', slug: 'tonog-kheregseel',
    name: 'Тоног хэрэгсэл',
    description: 'Гар ба цахилгаан хэрэгсэл, хатгамал, дарагч, өрмийн цоолтуур.',
    logo: 'https://picsum.photos/seed/sup6/80/80',
    coverImage: 'https://picsum.photos/seed/sup6cover/800/300',
    rating: 4.9, reviewCount: 401, productCount: 256, location: 'Сонгинохайрхан дүүрэг',
    phone: '9966-0066', deliveryTime: '2-4 хоног', minOrder: 500_000,
    categories: ['Хэрэгсэл', 'Цахилгаан хэрэгсэл', 'Гар хэрэгсэл'],
    verified: true,
  },
];

export const MOCK_PRODUCTS: MockProduct[] = [
  // Bariltga
  { id: 'p-1',  slug: 'cement-m500-50kg',          name: 'Цемент M500 50кг',           price: 3_200_000,  compareAtPrice: 3_500_000, image: 'https://picsum.photos/seed/p1/400/400',  category: 'Барилга',    supplierId: 'sup-1', supplierName: 'Ганцоо барилгын материал', rating: 4.7, reviewCount: 89,  inStock: true,  unit: 'уут'    },
  { id: 'p-2',  slug: 'tosgo-standart',             name: 'Тоосго стандарт 250шт',       price: 8_500_000,                             image: 'https://picsum.photos/seed/p2/400/400',  category: 'Барилга',    supplierId: 'sup-1', supplierName: 'Ганцоо барилгын материал', rating: 4.5, reviewCount: 42,  inStock: true,  unit: 'ш'      },
  { id: 'p-3',  slug: 'els-0-3mm-1ton',             name: 'Элс 0-3мм 1 тонн',           price: 1_800_000,                             image: 'https://picsum.photos/seed/p3/400/400',  category: 'Барилга',    supplierId: 'sup-1', supplierName: 'Ганцоо барилгын материал', rating: 4.3, reviewCount: 31,  inStock: true,  unit: 'тн'     },
  { id: 'p-4',  slug: 'huchill-hevtseg-150mm',      name: 'Хучилт хэвцэг 150мм',        price: 5_600_000,  compareAtPrice: 6_000_000, image: 'https://picsum.photos/seed/p4/400/400',  category: 'Барилга',    supplierId: 'sup-1', supplierName: 'Ганцоо барилгын материал', rating: 4.6, reviewCount: 18,  inStock: false, unit: 'ш'      },

  // Tömör
  { id: 'p-5',  slug: 'armatur-d12-12m',            name: 'Арматур D12 12м',             price: 1_450_000,                             image: 'https://picsum.photos/seed/p5/400/400',  category: 'Төмөр',      supplierId: 'sup-2', supplierName: 'Төмөр зах',                rating: 4.8, reviewCount: 67,  inStock: true,  unit: 'ш'      },
  { id: 'p-6',  slug: 'profil-60x40-6m',            name: 'Профиль 60x40 6м',            price: 2_200_000,                             image: 'https://picsum.photos/seed/p6/400/400',  category: 'Төмөр',      supplierId: 'sup-2', supplierName: 'Төмөр зах',                rating: 4.6, reviewCount: 43,  inStock: true,  unit: 'ш'      },
  { id: 'p-7',  slug: 'galvanized-hooloi-d50',      name: 'Хальслагдсан хоолой D50',     price: 890_000,                               image: 'https://picsum.photos/seed/p7/400/400',  category: 'Төмөр',      supplierId: 'sup-2', supplierName: 'Төмөр зах',                rating: 4.4, reviewCount: 28,  inStock: true,  unit: 'м'      },

  // Budag
  { id: 'p-8',  slug: 'dulux-weather-10l-tsagaan',  name: 'Dulux Weather 10л цагаан',    price: 7_500_000,  compareAtPrice: 8_200_000, image: 'https://picsum.photos/seed/p8/400/400',  category: 'Будаг',      supplierId: 'sup-3', supplierName: 'Будаг маркет',             rating: 4.9, reviewCount: 112, inStock: true,  unit: 'сав'    },
  { id: 'p-9',  slug: 'primer-akril-5l',            name: 'Праймер акрил 5л',            price: 2_800_000,                             image: 'https://picsum.photos/seed/p9/400/400',  category: 'Будаг',      supplierId: 'sup-3', supplierName: 'Будаг маркет',             rating: 4.6, reviewCount: 74,  inStock: true,  unit: 'сав'    },
  { id: 'p-10', slug: 'lak-parketnii-2.5l',         name: 'Лак паркетын 2.5л',           price: 4_100_000,                             image: 'https://picsum.photos/seed/p10/400/400', category: 'Будаг',      supplierId: 'sup-3', supplierName: 'Будаг маркет',             rating: 4.7, reviewCount: 55,  inStock: true,  unit: 'сав'    },

  // Santekhnik
  { id: 'p-11', slug: 'vanntai-grohe-70x120',       name: 'Ванн Grohe 70x120',           price: 45_000_000,                            image: 'https://picsum.photos/seed/p11/400/400', category: 'Сантехник',  supplierId: 'sup-4', supplierName: 'Сантехник про',            rating: 4.8, reviewCount: 23,  inStock: true,  unit: 'ш'      },
  { id: 'p-12', slug: 'chuguun-radyator-8-section', name: 'Чугуун радиатор 8 секц',      price: 12_000_000, compareAtPrice: 13_500_000,image: 'https://picsum.photos/seed/p12/400/400', category: 'Сантехник',  supplierId: 'sup-4', supplierName: 'Сантехник про',            rating: 4.5, reviewCount: 38,  inStock: true,  unit: 'ш'      },
  { id: 'p-13', slug: 'us-daman-hooloi-ppr-25',     name: 'Ус дамжуулах хоолой PPR 25',  price: 480_000,                               image: 'https://picsum.photos/seed/p13/400/400', category: 'Сантехник',  supplierId: 'sup-4', supplierName: 'Сантехник про',            rating: 4.3, reviewCount: 61,  inStock: true,  unit: 'м'      },

  // Tsakhilgaan
  { id: 'p-14', slug: 'kabel-vvg-3x2.5-100m',      name: 'Кабель ВВГ 3x2.5 100м',      price: 15_000_000,                            image: 'https://picsum.photos/seed/p14/400/400', category: 'Цахилгаан', supplierId: 'sup-5', supplierName: 'Цахилгаан тоол',          rating: 4.6, reviewCount: 47,  inStock: true,  unit: 'ш'      },
  { id: 'p-15', slug: 'led-panel-48w-600x600',      name: 'LED панель 48W 600x600',      price: 5_500_000,  compareAtPrice: 6_200_000, image: 'https://picsum.photos/seed/p15/400/400', category: 'Цахилгаан', supplierId: 'sup-5', supplierName: 'Цахилгаан тоол',          rating: 4.7, reviewCount: 82,  inStock: true,  unit: 'ш'      },
  { id: 'p-16', slug: 'rozet-legrand-2gang',        name: 'Розетка Legrand 2 нүхтэй',   price: 1_200_000,                             image: 'https://picsum.photos/seed/p16/400/400', category: 'Цахилгаан', supplierId: 'sup-5', supplierName: 'Цахилгаан тоол',          rating: 4.4, reviewCount: 34,  inStock: false, unit: 'ш'      },

  // Kheregseel
  { id: 'p-17', slug: 'makita-drill-hp488d',        name: 'Makita HP488D өрм',           price: 25_000_000, compareAtPrice: 28_000_000,image: 'https://picsum.photos/seed/p17/400/400', category: 'Хэрэгсэл',  supplierId: 'sup-6', supplierName: 'Тоног хэрэгсэл',          rating: 4.9, reviewCount: 156, inStock: true,  unit: 'ш'      },
  { id: 'p-18', slug: 'bosch-uga-125-grinder',      name: 'Bosch GWS 900 шлифлэгч',     price: 18_500_000,                            image: 'https://picsum.photos/seed/p18/400/400', category: 'Хэрэгсэл',  supplierId: 'sup-6', supplierName: 'Тоног хэрэгсэл',          rating: 4.8, reviewCount: 98,  inStock: true,  unit: 'ш'      },
  { id: 'p-19', slug: 'gar-kheregseel-set-24pc',    name: 'Гар хэрэгслийн иж бүрдэл 24ш', price: 12_000_000,                          image: 'https://picsum.photos/seed/p19/400/400', category: 'Хэрэгсэл',  supplierId: 'sup-6', supplierName: 'Тоног хэрэгсэл',          rating: 4.7, reviewCount: 73,  inStock: true,  unit: 'иж'     },
  { id: 'p-20', slug: 'stanley-rulyet-5m',          name: 'Stanley рулет 5м',            price: 850_000,                               image: 'https://picsum.photos/seed/p20/400/400', category: 'Хэрэгсэл',  supplierId: 'sup-6', supplierName: 'Тоног хэрэгсэл',          rating: 4.5, reviewCount: 211, inStock: true,  unit: 'ш'      },

  // Extra mix
  { id: 'p-21', slug: 'gips-knauf-10mm',            name: 'Гипс хавтан Knauf 10мм',      price: 2_100_000,                             image: 'https://picsum.photos/seed/p21/400/400', category: 'Барилга',    supplierId: 'sup-1', supplierName: 'Ганцоо барилгын материал', rating: 4.4, reviewCount: 56,  inStock: true,  unit: 'ш'      },
  { id: 'p-22', slug: 'mineralon-100mm-1m2',        name: 'Минерал хөөс 100мм',          price: 980_000,                               image: 'https://picsum.photos/seed/p22/400/400', category: 'Барилга',    supplierId: 'sup-1', supplierName: 'Ганцоо барилгын материал', rating: 4.3, reviewCount: 29,  inStock: true,  unit: 'м²'     },
  { id: 'p-23', slug: 'armatur-d8-6m',              name: 'Арматур D8 6м',               price: 480_000,                               image: 'https://picsum.photos/seed/p23/400/400', category: 'Төмөр',      supplierId: 'sup-2', supplierName: 'Төмөр зах',                rating: 4.6, reviewCount: 44,  inStock: true,  unit: 'ш'      },
  { id: 'p-24', slug: 'bathroom-mixer-grohe',       name: 'Угаалтуурын холигч Grohe',    price: 6_800_000,  compareAtPrice: 7_500_000, image: 'https://picsum.photos/seed/p24/400/400', category: 'Сантехник',  supplierId: 'sup-4', supplierName: 'Сантехник про',            rating: 4.7, reviewCount: 39,  inStock: true,  unit: 'ш'      },
];

export const MOCK_DRIVERS: MockDriver[] = [
  { id: 'd-1',  name: 'Анхбаяр Дамдин',  phone: '8800-1122', vehicleType: 'MOTORCYCLE', vehiclePlate: '2345-УБА', status: 'DELIVERING', lat: 47.920, lng: 106.985, rating: 4.8, completedDeliveries: 342, currentOrder: 'DIY-AB12CD34', eta: 8  },
  { id: 'd-2',  name: 'Болд Ганбаяр',    phone: '9911-2233', vehicleType: 'CAR',        vehiclePlate: '3456-УВА', status: 'DELIVERING', lat: 47.908, lng: 106.920, rating: 4.9, completedDeliveries: 521, currentOrder: 'DIY-EF56GH78', eta: 15 },
  { id: 'd-3',  name: 'Сарнай Батсүх',  phone: '8822-3344', vehicleType: 'MOTORCYCLE', vehiclePlate: '1234-УБА', status: 'ONLINE',     lat: 47.935, lng: 106.910, rating: 4.7, completedDeliveries: 218 },
  { id: 'd-4',  name: 'Дорж Мөнхбат',   phone: '9933-4455', vehicleType: 'CAR',        vehiclePlate: '5678-УВА', status: 'OFFLINE',    lat: 47.880, lng: 106.870, rating: 4.6, completedDeliveries: 189 },
  { id: 'd-5',  name: 'Тэгшжаргал Ним', phone: '7744-5566', vehicleType: 'VAN',        vehiclePlate: '9012-УВА', status: 'DELIVERING', lat: 47.915, lng: 106.900, rating: 4.5, completedDeliveries: 97,  currentOrder: 'DIY-KL90MN12', eta: 22 },
  { id: 'd-6',  name: 'Оюунаа Бат',     phone: '9955-6677', vehicleType: 'MOTORCYCLE', vehiclePlate: '4321-УБА', status: 'ONLINE',     lat: 47.928, lng: 106.945, rating: 4.8, completedDeliveries: 405 },
  { id: 'd-7',  name: 'Ганзориг Сүх',   phone: '8866-7788', vehicleType: 'CAR',        vehiclePlate: '6543-УВА', status: 'ONLINE',     lat: 47.903, lng: 106.958, rating: 4.4, completedDeliveries: 134 },
  { id: 'd-8',  name: 'Мөнхбаяр Нам',   phone: '9977-8899', vehicleType: 'VAN',        vehiclePlate: '7890-УБА', status: 'OFFLINE',    lat: 47.893, lng: 106.882, rating: 4.3, completedDeliveries: 62  },
  { id: 'd-9',  name: 'Энхбат Гантулга', phone: '8888-9900', vehicleType: 'MOTORCYCLE', vehiclePlate: '2109-УВА', status: 'ONLINE',     lat: 47.940, lng: 106.930, rating: 4.7, completedDeliveries: 278 },
  { id: 'd-10', name: 'Золзаяа Дорж',   phone: '9900-1234', vehicleType: 'CAR',        vehiclePlate: '3210-УБА', status: 'OFFLINE',    lat: 47.870, lng: 106.850, rating: 4.2, completedDeliveries: 43  },
];

export const MOCK_ORDERS: MockOrder[] = [
  { id: 'o-1',  code: 'DIY-AB12CD34', status: 'Хүргэлтэнд',      createdAt: '2026-05-26T08:23:00Z', total: 18_500_000, itemCount: 3, supplierName: 'Ганцоо барилгын материал', deliveryAddress: 'Баянзүрх дүүрэг, 5-р хороо, 32-р байр 15 тоот' },
  { id: 'o-2',  code: 'DIY-EF56GH78', status: 'Боловсруулж буй', createdAt: '2026-05-26T07:45:00Z', total: 7_200_000,  itemCount: 1, supplierName: 'Будаг маркет',             deliveryAddress: 'Сүхбаатар дүүрэг, 1-р хороо, Дэлгүүр орчмын зам' },
  { id: 'o-3',  code: 'DIY-KL90MN12', status: 'Хүлээгдэж буй',  createdAt: '2026-05-26T07:10:00Z', total: 31_000_000, itemCount: 5, supplierName: 'Төмөр зах',               deliveryAddress: 'Хан-Уул дүүрэг, Зайсан хотхон, 4-р блок 101' },
  { id: 'o-4',  code: 'DIY-OP34QR56', status: 'Хүргэгдсэн',     createdAt: '2026-05-25T15:30:00Z', total: 25_500_000, itemCount: 2, supplierName: 'Тоног хэрэгсэл',          deliveryAddress: 'Баянгол дүүрэг, Чингисийн өргөн чөлөө 44' },
  { id: 'o-5',  code: 'DIY-ST78UV90', status: 'Хүргэгдсэн',     createdAt: '2026-05-24T11:00:00Z', total: 12_800_000, itemCount: 4, supplierName: 'Сантехник про',            deliveryAddress: 'Чингэлтэй дүүрэг, Нарны зам 7А, 2-р давхар' },
  { id: 'o-6',  code: 'DIY-WX12YZ34', status: 'Цуцлагдсан',     createdAt: '2026-05-23T09:20:00Z', total: 5_600_000,  itemCount: 2, supplierName: 'Цахилгаан тоол',          deliveryAddress: 'Сонгинохайрхан дүүрэг, 21-р хороо' },
  { id: 'o-7',  code: 'DIY-AB34CD56', status: 'Хүргэгдсэн',     createdAt: '2026-05-22T14:15:00Z', total: 45_000_000, itemCount: 1, supplierName: 'Сантехник про',            deliveryAddress: 'Баянзүрх дүүрэг, Нарны зам 5, 3-р давхар' },
  { id: 'o-8',  code: 'DIY-EF78GH90', status: 'Хүргэгдсэн',     createdAt: '2026-05-21T10:05:00Z', total: 8_100_000,  itemCount: 6, supplierName: 'Будаг маркет',             deliveryAddress: 'Хан-Уул дүүрэг, Зайсан 12' },
  { id: 'o-9',  code: 'DIY-KL12MN34', status: 'Хүргэгдсэн',     createdAt: '2026-05-20T16:40:00Z', total: 22_300_000, itemCount: 3, supplierName: 'Ганцоо барилгын материал', deliveryAddress: 'Баянгол дүүрэг, 8-р хороо, 120-р байр' },
  { id: 'o-10', code: 'DIY-OP56QR78', status: 'Хүргэгдсэн',     createdAt: '2026-05-19T13:25:00Z', total: 15_600_000, itemCount: 2, supplierName: 'Тоног хэрэгсэл',          deliveryAddress: 'Сүхбаатар дүүрэг, Бага тойруу 14' },
];
