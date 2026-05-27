import { NextResponse } from 'next/server';

function setDriverCookies(response: NextResponse) {
  response.cookies.set('diy-driver', '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });
  response.cookies.set('diy-driver-status', 'ACTIVE', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });
  return response;
}

function getPublicOrigin(request: Request): string {
  // Prefer forwarded headers set by the reverse proxy (Caddy) over the raw
  // request URL, which may contain the internal container hostname.
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    new URL(request.url).host;
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/driver/dashboard';
  const origin = getPublicOrigin(request);
  return setDriverCookies(NextResponse.redirect(new URL(next, origin)));
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  return setDriverCookies(response);
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('diy-driver', '', { path: '/', maxAge: 0 });
  response.cookies.set('diy-driver-status', '', { path: '/', maxAge: 0 });
  return response;
}
