import { DriverStatus, VehicleType } from '../plugins/driver/driver.entity';
import { SupplierStatus } from '../plugins/supplier/supplier.entity';

export interface SampleSupplier {
  key: string;
  slug: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  logo: string;
  description: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  status: SupplierStatus;
}

export interface SampleProduct {
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  supplierKey: string;
  stock: number;
  enabled: boolean;
  unit: string;
  rating: number;
  reviewCount: number;
}

export const SAMPLE_SUPPLIERS: SampleSupplier[] = [
  {
    key: 'sup-1',
    slug: 'gantso-bariltgiin-material',
    businessName: 'Ганцоо барилгын материал',
    ownerName: 'Ганцоо',
    email: 'gantso@example.com',
    phone: '99110011',
    logo: 'https://picsum.photos/seed/sup1/80/80',
    description: 'Барилгын материалын тэргүүлэгч нийлүүлэгч. 20 жилийн туршлагатай.',
    district: 'Баянзүрх дүүрэг',
    address: 'Баянзүрх дүүрэг, 14-р хороо',
    lat: 47.920,
    lng: 106.985,
    rating: 4.8,
    reviewCount: 312,
    status: SupplierStatus.ACTIVE,
  },
  {
    key: 'sup-2',
    slug: 'tomor-zah',
    businessName: 'Төмөр зах',
    ownerName: 'Баттөмөр',
    email: 'tomor@example.com',
    phone: '99220022',
    logo: 'https://picsum.photos/seed/sup2/80/80',
    description: 'Төмрийн материал, хоолой, профиль. Өргөн сонголт, хямд үнэ.',
    district: 'Сүхбаатар дүүрэг',
    address: 'Сүхбаатар дүүрэг, 8-р хороо',
    lat: 47.908,
    lng: 106.920,
    rating: 4.6,
    reviewCount: 187,
    status: SupplierStatus.ACTIVE,
  },
  {
    key: 'sup-3',
    slug: 'budag-market',
    businessName: 'Будаг маркет',
    ownerName: 'Энхбуд',
    email: 'budag@example.com',
    phone: '99330033',
    logo: 'https://picsum.photos/seed/sup3/80/80',
    description: 'Дотоод, гадаад брэндийн будаг, лак, шингэлэгч бүтээгдэхүүн.',
    district: 'Баянгол дүүрэг',
    address: 'Баянгол дүүрэг, 3-р хороо',
    lat: 47.915,
    lng: 106.900,
    rating: 4.7,
    reviewCount: 224,
    status: SupplierStatus.ACTIVE,
  },
  {
    key: 'sup-4',
    slug: 'santekhnk-pro',
    businessName: 'Сантехник про',
    ownerName: 'Отгонсантех',
    email: 'santekhnik@example.com',
    phone: '99440044',
    logo: 'https://picsum.photos/seed/sup4/80/80',
    description: 'Усан хангамж, ариутгалын байгууламжийн тоног төхөөрөмж.',
    district: 'Хан-Уул дүүрэг',
    address: 'Хан-Уул дүүрэг, 15-р хороо',
    lat: 47.893,
    lng: 106.882,
    rating: 4.5,
    reviewCount: 143,
    status: SupplierStatus.ACTIVE,
  },
  {
    key: 'sup-5',
    slug: 'tsakhilgaan-tool',
    businessName: 'Цахилгаан тоол',
    ownerName: 'Цолмон',
    email: 'tsahilgaan@example.com',
    phone: '99550055',
    logo: 'https://picsum.photos/seed/sup5/80/80',
    description: 'Цахилгааны кабель, розетка, шилжүүлэгч, гэрэл.',
    district: 'Чингэлтэй дүүрэг',
    address: 'Чингэлтэй дүүрэг, 6-р хороо',
    lat: 47.935,
    lng: 106.910,
    rating: 4.4,
    reviewCount: 98,
    status: SupplierStatus.ACTIVE,
  },
  {
    key: 'sup-6',
    slug: 'tonog-kheregseel',
    businessName: 'Тоног хэрэгсэл',
    ownerName: 'Мөнхбаатар',
    email: 'tools@example.com',
    phone: '99660066',
    logo: 'https://picsum.photos/seed/sup6/80/80',
    description: 'Гар ба цахилгаан хэрэгсэл, өрмийн цоолтуур, засварын багаж.',
    district: 'Сонгинохайрхан дүүрэг',
    address: 'Сонгинохайрхан дүүрэг, 21-р хороо',
    lat: 47.903,
    lng: 106.958,
    rating: 4.9,
    reviewCount: 401,
    status: SupplierStatus.ACTIVE,
  },
];

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  { slug: 'cement-m500-50kg', name: 'Цемент M500 50кг', price: 3_200_000, originalPrice: 3_500_000, image: 'https://picsum.photos/seed/p1/400/400', category: 'Барилга', supplierKey: 'sup-1', stock: 120, enabled: true, unit: 'уут', rating: 4.7, reviewCount: 89 },
  { slug: 'tosgo-standart', name: 'Тоосго стандарт 250шт', price: 8_500_000, image: 'https://picsum.photos/seed/p2/400/400', category: 'Барилга', supplierKey: 'sup-1', stock: 80, enabled: true, unit: 'ш', rating: 4.5, reviewCount: 42 },
  { slug: 'els-0-3mm-1ton', name: 'Элс 0-3мм 1 тонн', price: 1_800_000, image: 'https://picsum.photos/seed/p3/400/400', category: 'Барилга', supplierKey: 'sup-1', stock: 55, enabled: true, unit: 'тн', rating: 4.3, reviewCount: 31 },
  { slug: 'huchill-hevtseg-150mm', name: 'Хучилт хэвцэг 150мм', price: 5_600_000, originalPrice: 6_000_000, image: 'https://picsum.photos/seed/p4/400/400', category: 'Барилга', supplierKey: 'sup-1', stock: 0, enabled: true, unit: 'ш', rating: 4.6, reviewCount: 18 },
  { slug: 'armatur-d12-12m', name: 'Арматур D12 12м', price: 1_450_000, image: 'https://picsum.photos/seed/p5/400/400', category: 'Төмөр', supplierKey: 'sup-2', stock: 300, enabled: true, unit: 'ш', rating: 4.8, reviewCount: 67 },
  { slug: 'profil-60x40-6m', name: 'Профиль 60x40 6м', price: 2_200_000, image: 'https://picsum.photos/seed/p6/400/400', category: 'Төмөр', supplierKey: 'sup-2', stock: 210, enabled: true, unit: 'ш', rating: 4.6, reviewCount: 43 },
  { slug: 'galvanized-hooloi-d50', name: 'Хальслагдсан хоолой D50', price: 890_000, image: 'https://picsum.photos/seed/p7/400/400', category: 'Төмөр', supplierKey: 'sup-2', stock: 180, enabled: true, unit: 'м', rating: 4.4, reviewCount: 28 },
  { slug: 'dulux-weather-10l-tsagaan', name: 'Dulux Weather 10л цагаан', price: 7_500_000, originalPrice: 8_200_000, image: 'https://picsum.photos/seed/p8/400/400', category: 'Будаг', supplierKey: 'sup-3', stock: 65, enabled: true, unit: 'сав', rating: 4.9, reviewCount: 112 },
  { slug: 'primer-akril-5l', name: 'Праймер акрил 5л', price: 2_800_000, image: 'https://picsum.photos/seed/p9/400/400', category: 'Будаг', supplierKey: 'sup-3', stock: 72, enabled: true, unit: 'сав', rating: 4.6, reviewCount: 74 },
  { slug: 'lak-parketnii-2.5l', name: 'Лак паркетын 2.5л', price: 4_100_000, image: 'https://picsum.photos/seed/p10/400/400', category: 'Будаг', supplierKey: 'sup-3', stock: 40, enabled: true, unit: 'сав', rating: 4.7, reviewCount: 55 },
  { slug: 'vanntai-grohe-70x120', name: 'Ванн Grohe 70x120', price: 45_000_000, image: 'https://picsum.photos/seed/p11/400/400', category: 'Сантехник', supplierKey: 'sup-4', stock: 8, enabled: true, unit: 'ш', rating: 4.8, reviewCount: 23 },
  { slug: 'chuguun-radyator-8-section', name: 'Чугуун радиатор 8 секц', price: 12_000_000, originalPrice: 13_500_000, image: 'https://picsum.photos/seed/p12/400/400', category: 'Сантехник', supplierKey: 'sup-4', stock: 25, enabled: true, unit: 'ш', rating: 4.5, reviewCount: 38 },
  { slug: 'us-daman-hooloi-ppr-25', name: 'Ус дамжуулах хоолой PPR 25', price: 480_000, image: 'https://picsum.photos/seed/p13/400/400', category: 'Сантехник', supplierKey: 'sup-4', stock: 460, enabled: true, unit: 'м', rating: 4.3, reviewCount: 61 },
  { slug: 'kabel-vvg-3x2.5-100m', name: 'Кабель ВВГ 3x2.5 100м', price: 15_000_000, image: 'https://picsum.photos/seed/p14/400/400', category: 'Цахилгаан', supplierKey: 'sup-5', stock: 35, enabled: true, unit: 'ш', rating: 4.6, reviewCount: 47 },
  { slug: 'led-panel-48w-600x600', name: 'LED панель 48W 600x600', price: 5_500_000, originalPrice: 6_200_000, image: 'https://picsum.photos/seed/p15/400/400', category: 'Цахилгаан', supplierKey: 'sup-5', stock: 90, enabled: true, unit: 'ш', rating: 4.7, reviewCount: 82 },
  { slug: 'rozet-legrand-2gang', name: 'Розетка Legrand 2 нүхтэй', price: 1_200_000, image: 'https://picsum.photos/seed/p16/400/400', category: 'Цахилгаан', supplierKey: 'sup-5', stock: 0, enabled: true, unit: 'ш', rating: 4.4, reviewCount: 34 },
  { slug: 'makita-drill-hp488d', name: 'Makita HP488D өрм', price: 25_000_000, originalPrice: 28_000_000, image: 'https://picsum.photos/seed/p17/400/400', category: 'Хэрэгсэл', supplierKey: 'sup-6', stock: 15, enabled: true, unit: 'ш', rating: 4.9, reviewCount: 156 },
  { slug: 'bosch-uga-125-grinder', name: 'Bosch GWS 900 шлифлэгч', price: 18_500_000, image: 'https://picsum.photos/seed/p18/400/400', category: 'Хэрэгсэл', supplierKey: 'sup-6', stock: 20, enabled: true, unit: 'ш', rating: 4.8, reviewCount: 98 },
  { slug: 'gar-kheregseel-set-24pc', name: 'Гар хэрэгслийн иж бүрдэл 24ш', price: 12_000_000, image: 'https://picsum.photos/seed/p19/400/400', category: 'Хэрэгсэл', supplierKey: 'sup-6', stock: 36, enabled: true, unit: 'иж', rating: 4.7, reviewCount: 73 },
  { slug: 'stanley-rulyet-5m', name: 'Stanley рулет 5м', price: 850_000, image: 'https://picsum.photos/seed/p20/400/400', category: 'Хэрэгсэл', supplierKey: 'sup-6', stock: 130, enabled: true, unit: 'ш', rating: 4.5, reviewCount: 211 },
  { slug: 'gips-knauf-10mm', name: 'Гипс хавтан Knauf 10мм', price: 2_100_000, image: 'https://picsum.photos/seed/p21/400/400', category: 'Барилга', supplierKey: 'sup-1', stock: 95, enabled: true, unit: 'ш', rating: 4.4, reviewCount: 56 },
  { slug: 'mineralon-100mm-1m2', name: 'Минерал хөөс 100мм', price: 980_000, image: 'https://picsum.photos/seed/p22/400/400', category: 'Барилга', supplierKey: 'sup-1', stock: 110, enabled: true, unit: 'м2', rating: 4.3, reviewCount: 29 },
  { slug: 'armatur-d8-6m', name: 'Арматур D8 6м', price: 480_000, image: 'https://picsum.photos/seed/p23/400/400', category: 'Төмөр', supplierKey: 'sup-2', stock: 420, enabled: true, unit: 'ш', rating: 4.6, reviewCount: 44 },
  { slug: 'bathroom-mixer-grohe', name: 'Угаалтуурын холигч Grohe', price: 6_800_000, originalPrice: 7_500_000, image: 'https://picsum.photos/seed/p24/400/400', category: 'Сантехник', supplierKey: 'sup-4', stock: 18, enabled: true, unit: 'ш', rating: 4.7, reviewCount: 39 },
];

export const SAMPLE_DRIVERS = [
  { firstName: 'Анхбаяр', lastName: 'Дамдин', phone: '88001122', vehicleType: VehicleType.MOTORCYCLE, vehiclePlate: '2345-УБА', status: DriverStatus.ACTIVE, isOnline: true, currentLat: 47.920, currentLng: 106.985, rating: 4.8, totalDeliveries: 342 },
  { firstName: 'Болд', lastName: 'Ганбаяр', phone: '99112233', vehicleType: VehicleType.CAR, vehiclePlate: '3456-УВА', status: DriverStatus.ACTIVE, isOnline: true, currentLat: 47.908, currentLng: 106.920, rating: 4.9, totalDeliveries: 521 },
  { firstName: 'Сарнай', lastName: 'Батсүх', phone: '88223344', vehicleType: VehicleType.MOTORCYCLE, vehiclePlate: '1234-УБА', status: DriverStatus.ACTIVE, isOnline: true, currentLat: 47.935, currentLng: 106.910, rating: 4.7, totalDeliveries: 218 },
  { firstName: 'Дорж', lastName: 'Мөнхбат', phone: '99334455', vehicleType: VehicleType.CAR, vehiclePlate: '5678-УВА', status: DriverStatus.ACTIVE, isOnline: false, currentLat: 47.880, currentLng: 106.870, rating: 4.6, totalDeliveries: 189 },
  { firstName: 'Тэгшжаргал', lastName: 'Ним', phone: '77445566', vehicleType: VehicleType.VAN, vehiclePlate: '9012-УВА', status: DriverStatus.ACTIVE, isOnline: true, currentLat: 47.915, currentLng: 106.900, rating: 4.5, totalDeliveries: 97 },
];

export const SAMPLE_BANNERS = [
  {
    title: 'Барилгын материал нэг дор',
    subtitle: 'Цемент, арматур, будаг, сантехникийн барааг баталгаатай нийлүүлэгчдээс захиалаарай.',
    eyebrow: 'DIY Store',
    ctaLabel: 'Каталог үзэх',
    ctaHref: '/category',
    imageUrl: 'https://picsum.photos/seed/diy-banner-1/1400/620',
    accentColor: '#ff4500',
    sortOrder: 1,
    enabled: true,
  },
  {
    title: 'Нийлүүлэгчийн бараа шууд хүргэлттэй',
    subtitle: 'Олон дэлгүүрийн барааг нэг сагсаар захиалж, хүргэлтээ хянаарай.',
    eyebrow: 'Marketplace',
    ctaLabel: 'Нийлүүлэгчид',
    ctaHref: '/suppliers',
    imageUrl: 'https://picsum.photos/seed/diy-banner-2/1400/620',
    accentColor: '#0f766e',
    sortOrder: 2,
    enabled: true,
  },
];
