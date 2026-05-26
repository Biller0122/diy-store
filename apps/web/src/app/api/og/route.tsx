import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const BRAND = '#FF4500';
const DARK  = '#0A0A0F';
const CARD  = '#16161F';
const MUTED = '#9999AA';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type  = searchParams.get('type') ?? 'default';
  const name  = searchParams.get('name') ?? 'DIY Store';
  const price = searchParams.get('price');
  const icon  = searchParams.get('icon') ?? '📦';
  const emoji = searchParams.get('emoji') ?? '📖';
  const title = searchParams.get('title') ?? name;

  if (type === 'product') {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: DARK,
            fontFamily: 'sans-serif',
          }}
        >
          {/* Left accent bar */}
          <div style={{ width: 8, background: BRAND, flexShrink: 0 }} />

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 64px', justifyContent: 'space-between' }}>
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔨</div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>DIY<span style={{ color: BRAND }}>Store</span></span>
            </div>

            {/* Product name */}
            <div>
              <p style={{ color: MUTED, fontSize: 18, margin: '0 0 12px' }}>Бүтээгдэхүүн</p>
              <h1 style={{ color: '#fff', fontSize: 52, fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
                {name.length > 50 ? name.slice(0, 50) + '…' : name}
              </h1>
              {price && (
                <p style={{ color: BRAND, fontSize: 36, fontWeight: 700, marginTop: 16, fontFamily: 'monospace' }}>
                  ₮{Number(price).toLocaleString()}
                </p>
              )}
            </div>

            {/* Footer */}
            <p style={{ color: MUTED, fontSize: 16, margin: 0 }}>diy-store.mn — Шуурхай хүргэлт</p>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  if (type === 'category') {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: `linear-gradient(135deg, ${DARK} 0%, ${CARD} 100%)`,
            fontFamily: 'sans-serif',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div style={{ fontSize: 120 }}>{icon}</div>
          <h1 style={{ color: '#fff', fontSize: 64, fontWeight: 800, margin: 0, textAlign: 'center' }}>{name}</h1>
          <p style={{ color: MUTED, fontSize: 24, margin: 0 }}>diy-store.mn</p>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: BRAND }} />
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  if (type === 'article') {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: DARK,
            fontFamily: 'sans-serif',
            padding: '64px',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔨</div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>DIY<span style={{ color: BRAND }}>Store</span> <span style={{ color: MUTED, fontWeight: 400 }}>/ Заавар</span></span>
          </div>

          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div style={{ fontSize: 100, flexShrink: 0 }}>{emoji}</div>
            <h1 style={{ color: '#fff', fontSize: 48, fontWeight: 800, lineHeight: 1.2, margin: 0 }}>
              {title.length > 80 ? title.slice(0, 80) + '…' : title}
            </h1>
          </div>

          <p style={{ color: MUTED, fontSize: 20, margin: 0 }}>diy-store.mn/how-to</p>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  // Default
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: DARK,
          fontFamily: 'sans-serif',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ fontSize: 80 }}>🔨</div>
        <h1 style={{ color: '#fff', fontSize: 72, fontWeight: 900, margin: 0 }}>DIY<span style={{ color: BRAND }}>Store</span></h1>
        <p style={{ color: MUTED, fontSize: 28, margin: 0 }}>Барилга. Засвар. Бүтээл.</p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: BRAND }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
