# DIY Store Feature Inventory

This inventory tracks the current implemented surface before launch hardening.

## Backend (`apps/server`)

- Customer auth: password registration/login, email OTP login, password reset OTP, Google login.
- Supplier: registration, OTP login, profile/status management, products, supplier orders, delivery actions.
- Driver: registration, password/OTP login, profile, online status, location, earnings, delivery history.
- Delivery: request creation, dispatch, accept/reject, status/location updates, completion code, delivery fee.
- Payment: QPay, MonPay, card handlers with non-production mock mode.
- Search: Vendure search plus custom semantic/embedding services.
- Product AI: product image analysis.
- Realtime: Socket.IO driver/order/customer events and Redis bridge.
- CMS/review/device-token/admin-stats plugins.

## Web (`apps/web`)

- Storefront: home, category/product browsing, search, cart, checkout, order tracking.
- Account: login, orders, addresses, wishlist-related UI.
- Admin: products, orders, deliveries, drivers, customers, suppliers, categories, reviews, analytics, commission, CMS.
- Supplier portal: auth, dashboard, products, bulk product tooling, orders.
- Driver portal: dashboard, active deliveries, earnings, delivery offers.
- API routes: delivery fee, product analysis, pattern generation, sessions.

## Web Supplier (`apps/web-supplier`)

- CSV/product bulk upload flow, data grid editing, AI product recognition.

## AI Image (`apps/ai-image`)

- Pattern generation endpoint.
- Product cleanup/cutout endpoint.
- Health endpoint.

## Mobile

- Customer: auth, home/search, supplier cart, checkout, order tracking.
- Driver: auth, dashboard, online/offline state, realtime delivery offer, location updates, earnings/profile.
- Supplier: auth, dashboard, product list/detail/add/edit, orders, revenue, reviews, settings, AI product analysis.
