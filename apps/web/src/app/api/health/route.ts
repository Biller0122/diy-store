import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'web',
    portal: process.env.APP_PORTAL || 'all',
  });
}
