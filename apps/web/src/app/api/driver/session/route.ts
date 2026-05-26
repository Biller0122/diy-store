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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/driver/dashboard';
  return setDriverCookies(NextResponse.redirect(new URL(next, request.url)));
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
