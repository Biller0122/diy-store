export interface SupplierCard {
  id: string;
  businessName: string;
  slug: string;
  logo?: string;
  description: string;
  district: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  deliveryTime: string;
  isOpen: boolean;
  categories: string[];
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

export const MOCK_SUPPLIERS: SupplierCard[] = [
  {
    id: 'sup-001',
    businessName: 'БудагМаркет ХХК',
    slug: 'budag-market',
    description: 'Монголын хамгийн том будаг, засал чимэглэлийн дэлгүүр. 500+ ширхэг будаг, праймер, нэмэлт хэрэгсэл.',
    district: 'Баянзүрх',
    rating: 4.7,
    reviewCount: 234,
    productCount: 312,
    deliveryTime: '30-45 мин',
    isOpen: true,
    categories: ['Будаг', 'Праймер', 'Засал чимэглэл'],
    phone: '+97699001122',
    address: 'Баянзүрх дүүрэг, 5-р хороо, Барилгачдын гудамж 15',
    lat: 47.9231,
    lng: 106.9350,
  },
  {
    id: 'sup-002',
    businessName: 'Тоног Хэрэгсэл ХХК',
    slug: 'tonog-kheregseel',
    description: 'Мэргэжлийн тоног хэрэгсэл, Makita, Bosch, DeWalt бренд. 20 жилийн туршлагатай.',
    district: 'Сүхбаатар',
    rating: 4.5,
    reviewCount: 189,
    productCount: 245,
    deliveryTime: '20-35 мин',
    isOpen: true,
    categories: ['Цахилгаан тоног', 'Гар тоног', 'Хэмжих'],
    phone: '+97699003344',
    address: 'Сүхбаатар дүүрэг, 8-р хороо, Гэгээн Өндөр 22',
    lat: 47.9180,
    lng: 106.9200,
  },
  {
    id: 'sup-003',
    businessName: 'СантехникПро',
    slug: 'santekhnk-pro',
    description: 'Ус хангамж, халаалт, сантехникийн бүрэн иж бүрдэл. Grohe, Roca, Cersanit бренд.',
    district: 'Хан-Уул',
    rating: 4.8,
    reviewCount: 156,
    productCount: 189,
    deliveryTime: '40-60 мин',
    isOpen: true,
    categories: ['Угаалтуур', 'Хоолой', 'Халаалт'],
    phone: '+97699005566',
    address: 'Хан-Уул дүүрэг, 14-р хороо, Сонсголон 8',
    lat: 47.8900,
    lng: 106.9100,
  },
  {
    id: 'sup-004',
    businessName: 'ЦахилгаанДэлгүүр',
    slug: 'tsakhilgaan-delguur',
    description: 'Цахилгааны тоног хэрэгсэл, утас, холбогч, хамгаалалтын хэрэгсэл. Schneider, Legrand.',
    district: 'Баянгол',
    rating: 4.6,
    reviewCount: 312,
    productCount: 420,
    deliveryTime: '25-40 мин',
    isOpen: true,
    categories: ['Утас', 'Самбар', 'Гэрэлтүүлэг'],
    phone: '+97699007788',
    address: 'Баянгол дүүрэг, 3-р хороо, Чингисийн өргөн чөлөө 45',
    lat: 47.9050,
    lng: 106.8800,
  },
  {
    id: 'sup-005',
    businessName: 'Шал & Хана',
    slug: 'shal-khana',
    description: 'Паркет шал, хивс, хана дардас, кафель. 200+ загварын шал, 300+ хана дардас.',
    district: 'Чингэлтэй',
    rating: 4.4,
    reviewCount: 98,
    productCount: 567,
    deliveryTime: '45-90 мин',
    isOpen: false,
    categories: ['Паркет', 'Кафель', 'Хана дардас'],
    phone: '+97699009900',
    address: 'Чингэлтэй дүүрэг, 1-р хороо, Их Тойруу 12',
    lat: 47.9300,
    lng: 106.9150,
  },
  {
    id: 'sup-006',
    businessName: 'МеталлТрейд',
    slug: 'metall-trade',
    description: 'Барилгын металл материал, хавтан, профиль, болт эмжээр. Бөөн болон жижиглэн.',
    district: 'Налайх',
    rating: 4.3,
    reviewCount: 67,
    productCount: 234,
    deliveryTime: '60-120 мин',
    isOpen: true,
    categories: ['Металл', 'Профиль', 'Болт'],
    phone: '+97699002233',
    address: 'Налайх дүүрэг, 2-р хороо, Уурхайчдын гудамж 5',
    lat: 47.7600,
    lng: 107.2800,
  },
];

export const MOCK_SUPPLIER_PRODUCTS: Record<string, Array<{
  id: string; variantId: string; name: string; slug: string;
  image: string; price: number; originalPrice?: number;
  rating: number; reviewCount: number; badge?: string; inStock: boolean;
}>> = {
  'budag-market': [
    { id: 'bp1', variantId: 'bv1', name: 'Dulux EasyCare 4L Цагаан', slug: 'dulux-easyccare-white', image: '', price: 5990000, rating: 4.8, reviewCount: 124, badge: 'ТОП', inStock: true },
    { id: 'bp2', variantId: 'bv2', name: 'Caparol Indeko 10L', slug: 'caparol-indeko-10l', image: '', price: 18990000, originalPrice: 22990000, rating: 4.6, reviewCount: 89, badge: 'ХЯМДРАЛ', inStock: true },
    { id: 'bp3', variantId: 'bv3', name: 'Knauf Праймер 25кг', slug: 'knauf-primer', image: '', price: 3990000, rating: 4.5, reviewCount: 67, inStock: true },
    { id: 'bp4', variantId: 'bv4', name: 'Dulux Weathershield 4L', slug: 'dulux-weathershield', image: '', price: 7990000, rating: 4.7, reviewCount: 45, badge: 'ШИНЭ', inStock: true },
    { id: 'bp5', variantId: 'bv5', name: 'Marshall Бусолят Буяан 2.5L', slug: 'marshall-busalat', image: '', price: 4990000, originalPrice: 5990000, rating: 4.4, reviewCount: 33, badge: 'ХЯМДРАЛ', inStock: true },
    { id: 'bp6', variantId: 'bv6', name: 'Sadolin Extra White 1L', slug: 'sadolin-extra', image: '', price: 2490000, rating: 4.3, reviewCount: 28, inStock: false },
  ],
  'tonog-kheregseel': [
    { id: 'tp1', variantId: 'tv1', name: 'Makita 18V Өрөм DTD153', slug: 'makita-dtd153', image: '', price: 28990000, rating: 4.9, reviewCount: 247, badge: 'ТОП', inStock: true },
    { id: 'tp2', variantId: 'tv2', name: 'Bosch GBH 2-26 Перфоратор', slug: 'bosch-gbh226', image: '', price: 35990000, originalPrice: 42990000, rating: 4.8, reviewCount: 156, badge: 'ХЯМДРАЛ', inStock: true },
    { id: 'tp3', variantId: 'tv3', name: 'DeWalt DCD796 Гар өрөм', slug: 'dewalt-dcd796', image: '', price: 24990000, rating: 4.7, reviewCount: 98, inStock: true },
    { id: 'tp4', variantId: 'tv4', name: 'Stanley 210ш Багажны иж', slug: 'stanley-kit-210', image: '', price: 18990000, rating: 4.8, reviewCount: 312, badge: 'ШИНЭ', inStock: true },
  ],
  'santekhnk-pro': [
    { id: 'sp1', variantId: 'sv1', name: 'Grohe Eurosmart Ханын краан', slug: 'grohe-eurosmart', image: '', price: 34990000, rating: 4.9, reviewCount: 77, badge: 'ТОП', inStock: true },
    { id: 'sp2', variantId: 'sv2', name: 'Roca Nexo Угаалтуур', slug: 'roca-nexo', image: '', price: 24990000, rating: 4.7, reviewCount: 54, inStock: true },
    { id: 'sp3', variantId: 'sv3', name: 'Cersanit 600x600 Kафель', slug: 'cersanit-tile', image: '', price: 3990000, originalPrice: 4990000, rating: 4.5, reviewCount: 89, badge: 'ХЯМДРАЛ', inStock: true },
  ],
};
