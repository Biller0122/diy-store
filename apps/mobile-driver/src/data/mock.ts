import type { Driver } from '../api/client';
import type { ActiveOrder } from '../store/delivery';

export const SUPPORT_PHONE = '77000000';

export const MOCK_DRIVER: Driver = {
  id: 'driver-dev-001',
  firstName: 'Ганболд',
  lastName: 'Мөнхбат',
  emailAddress: 'driver@diystore.mn',
  phone: '88224466',
  vehicleType: 'CAR',
  vehiclePlate: 'УБ-1234АА',
  vehicleModel: 'Toyota Prius 2020',
  status: 'ACTIVE',
  isOnline: false,
  rating: 4.9,
  totalDeliveries: 128,
  todayEarnings: 24500,
  totalEarnings: 1850000,
  bankName: 'Хаан банк',
  bankAccount: '5030001122',
  createdAt: '2025-11-01T00:00:00.000Z',
};

export const MOCK_ORDER: ActiveOrder = {
  id: 'delivery-dev-001',
  orderId: 'ORD-2026-0529-001',
  orderNumber: '#DIY-2024-01001',
  customerName: 'Бат-Эрдэнэ',
  customerPhone: '99112233',
  customerDistrict: 'Чингэлтэй',
  customerKhoroo: '3-р хороо',
  dropoffAddress: 'Чингэлтэй дүүрэг, 3-р хороо, 12-р байр 45 тоот',
  dropoffLat: 47.9268,
  dropoffLng: 106.9145,
  distance: 4.2,
  estimatedDuration: 25,
  fee: 8500,
  status: 'DRIVER_ASSIGNED',
  currentStop: 0,
  deliveryNote: 'Орцны код 1234. Хүрэхээс өмнө залгана уу.',
  pickupStops: [
    {
      supplierId: 'sup-001',
      supplierName: 'Ганцоо барилгын материал',
      district: 'Баянзүрх',
      address: 'Баянзүрх дүүрэг, Барилгачдын гудамж 15',
      phone: '99001122',
      items: [
        { name: 'Өрөм Bosch 800W', qty: 1 },
        { name: 'Будаг цагаан', qty: 2 },
      ],
      lat: 47.9185,
      lng: 106.9403,
      status: 'PENDING',
    },
    {
      supplierId: 'sup-002',
      supplierName: 'Төмөр зах',
      district: 'Сүхбаатар',
      address: 'Сүхбаатар дүүрэг, Гэгээн Өндөр 22',
      phone: '88334455',
      items: [
        { name: 'Хадаас жижиг', qty: 100 },
        { name: 'Гайк М10', qty: 20 },
      ],
      lat: 47.9208,
      lng: 106.9279,
      status: 'PENDING',
    },
  ],
};

export const RECENT_DELIVERIES = [
  { id: 'D-1092', district: 'Чингэлтэй', date: 'Өнөөдөр 12:40', amount: 8500, color: '#FF4500' },
  { id: 'D-1091', district: 'Баянзүрх', date: 'Өнөөдөр 11:15', amount: 6500, color: '#00D4AA' },
  { id: 'D-1090', district: 'Хан-Уул', date: 'Өнөөдөр 09:50', amount: 9200, color: '#FFB547' },
];

export const EARNINGS_HISTORY = [
  { id: 'D-1092', orderNumber: '#DIY-2024-01092', date: 'Өнөөдөр 12:40', from: 'Баянзүрх', to: 'Чингэлтэй', amount: 8500, rating: 5 },
  { id: 'D-1091', orderNumber: '#DIY-2024-01091', date: 'Өнөөдөр 11:15', from: 'Сүхбаатар', to: 'Баянзүрх', amount: 6500, rating: 5 },
  { id: 'D-1090', orderNumber: '#DIY-2024-01090', date: 'Өнөөдөр 09:50', from: 'Хан-Уул', to: 'Баянгол', amount: 9200, rating: 4.8 },
  { id: 'D-1089', orderNumber: '#DIY-2024-01089', date: 'Өчигдөр 18:10', from: 'Сонгинохайрхан', to: 'Сүхбаатар', amount: 7000, rating: 5 },
];
