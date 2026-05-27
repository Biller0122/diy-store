import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ['/account/:path*', '/supplier/:path*', '/driver/:path*', '/admin/:path*'],
};
