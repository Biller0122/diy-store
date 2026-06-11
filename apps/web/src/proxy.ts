import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Portal = 'customer' | 'admin' | 'driver' | 'merchant';

const portal = (process.env.APP_PORTAL || process.env.NEXT_PUBLIC_APP_PORTAL) as Portal | undefined;

const sharedPrefixes = [
  '/_next',
  '/api',
  '/assets',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/shop-api',
  '/admin-api',
  '/analyze-product',
  '/edit-product-image',
  '/generate-pattern',
  '/mailbox',
  '/socket.io',
];

function redirectTo(request: NextRequest, path: string, withRedirect = true) {
  // Use the forwarded host from the reverse proxy (Caddy) to avoid embedding
  // the internal container hostname in redirect Location headers.
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const url = new URL(path, `${proto}://${host}`);
  if (withRedirect && path !== '/') {
    url.searchParams.set('redirect', request.nextUrl.pathname);
  }
  return NextResponse.redirect(url);
}

function isSharedPath(pathname: string) {
  return sharedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function portalGuard(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!portal || isSharedPath(pathname)) return null;

  if (portal === 'customer') {
    const blocked = ['/admin', '/driver', '/supplier'];
    return blocked.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
      ? redirectTo(request, '/', false)
      : null;
  }

  if (portal === 'admin') {
    return pathname === '/' ? redirectTo(request, '/admin', false) : pathname.startsWith('/admin') ? null : redirectTo(request, '/admin', false);
  }

  if (portal === 'driver') {
    return pathname === '/' ? redirectTo(request, '/driver', false) : pathname.startsWith('/driver') ? null : redirectTo(request, '/driver', false);
  }

  if (portal === 'merchant') {
    return pathname === '/' ? redirectTo(request, '/supplier', false) : pathname.startsWith('/supplier') ? null : redirectTo(request, '/supplier', false);
  }

  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isSharedPath(pathname)) return NextResponse.next();

  const portalRedirect = portalGuard(request);
  if (portalRedirect) return portalRedirect;

  // ─── Admin ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!request.cookies.get('diy-admin')?.value) {
      return redirectTo(request, '/admin/login');
    }
  }

  // ─── Customer account ──────────────────────────────────────────────────
  // Roles are fully independent: having a supplier/driver session does NOT
  // grant access to /account and vice versa.
  if (pathname.startsWith('/account') && pathname !== '/account/login') {
    if (!request.cookies.get('diy-auth')?.value) {
      return redirectTo(request, '/account/login');
    }
  }

  // ─── Supplier portal ──────────────────────────────────────────────────
  const SUPPLIER_PROTECTED = [
    '/supplier/dashboard',
    '/supplier/products',
    '/supplier/orders',
    '/supplier/revenue',
    '/supplier/reviews',
    '/supplier/settings',
    '/supplier/payouts',
  ];
  if (SUPPLIER_PROTECTED.some((p) => pathname.startsWith(p))) {
    const supplierCookie = request.cookies.get('diy-supplier')?.value;
    if (!supplierCookie) {
      return redirectTo(request, '/supplier/login');
    }
    const supplierStatus = request.cookies.get('diy-supplier-status')?.value;
    if (supplierStatus === 'PENDING' || supplierStatus === 'PENDING_APPROVAL' || supplierStatus === 'PENDING_VERIFICATION') {
      return NextResponse.redirect(new URL('/supplier/pending', request.url));
    }
    if (supplierStatus === 'SUSPENDED' || supplierStatus === 'REJECTED') {
      return NextResponse.redirect(new URL('/supplier/login', request.url));
    }
  }

  // ─── Driver portal ────────────────────────────────────────────────────
  const DRIVER_PROTECTED = [
    '/driver/dashboard',
    '/driver/active-delivery',
    '/driver/earnings',
    '/driver/history',
    '/driver/deliveries',
    '/driver/active',
  ];
  if (DRIVER_PROTECTED.some((p) => pathname.startsWith(p))) {
    const driverCookie = request.cookies.get('diy-driver')?.value;
    if (!driverCookie) {
      return redirectTo(request, '/driver/login');
    }
    const driverStatus = request.cookies.get('diy-driver-status')?.value;
    if (driverStatus === 'PENDING_VERIFICATION' || driverStatus === 'PENDING_APPROVAL') {
      return NextResponse.redirect(new URL('/driver/pending', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)', '/favicon.ico'],
};
