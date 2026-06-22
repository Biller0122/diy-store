# DIY Store Mobile Apps

## Apps

- `apps/mobile-driver` - жолоочийн апп
- `apps/mobile-customer` - хэрэглэгчийн апп
- `apps/mobile-supplier` - нийлүүлэгчийн апп

## Setup

```bash
cd apps/mobile-driver
npm install
npx expo start
```

```bash
cd apps/mobile-customer
npm install
npx expo start
```

```bash
cd apps/mobile-supplier
npm install
npx expo start
```

Expo Go дээр туршихдаа терминал дээр гарсан QR кодыг утсаараа уншуулна.

## Type Check

```bash
cd apps/mobile-driver && npx tsc --noEmit
cd apps/mobile-customer && npx tsc --noEmit
cd apps/mobile-supplier && npx tsc --noEmit
```

## EAS Build

Driver app-ийн Google Maps key-г EAS secret/env-ээр өгнө:

```bash
cd apps/mobile-driver
npx eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value "<google-maps-api-key>"
```

```bash
cd apps/mobile-driver
npx eas build --platform android
npx eas build --platform ios
```

```bash
cd apps/mobile-customer
npx eas build --platform android
npx eas build --platform ios
```

```bash
cd apps/mobile-supplier
npx eas build --platform android
npx eas build --platform ios
```

## API Endpoints

- Shop API: `https://shoptool.mn/shop-api`
- Admin API: `https://shoptool.mn/admin-api`
- Realtime Socket: `https://shoptool.mn`

## Realtime Events

- `order:join` - захиалгын өрөөнд нэгдэх
- `driver:join` - жолоочийн өрөөнд нэгдэх
- `driver:location` - жолоочийн байршил илгээх, захиалгын өрөөнд дамжуулах
- `order:status` - захиалгын төлөв дамжуулах
- `delivery:request` - жолоочид шинэ хүргэлтийн санал илгээх
- `driver:online` / `driver:offline` - жолоочийн онлайн төлөв шинэчлэх

## Notes

Root дээрх `customer-qr.html`, `supplier-qr.html`, `expo-supplier-qr.html` нь зөвхөн dev helper. Expo URL өөрчлөгдвөл `?url=exp://YOUR-LAN-IP:PORT` query-ээр өөрийн одоогийн LAN URL-ийг өгнө.

Одоогийн мобайл аппууд mock өгөгдөлтэй ажиллаж, `packages/api-client`-ээр Vendure болон realtime endpoint руу холбогдох суурь hook-уудтай болсон.
