import { NextResponse } from 'next/server';

const ADMIN_COOKIE = 'diy-admin';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, '1', {
    path: '/',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
