import {
  hasSupplierAuthToken,
  resolveVendureAssetUrl,
  setSupplierAuthToken,
} from '@/lib/vendure';

function token(payload: Record<string, unknown>) {
  const encode = (value: object) => btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('Vendure supplier session helpers', () => {
  beforeEach(() => window.localStorage.clear());

  it('normalizes a raw S3 asset key to the Vendure asset route', () => {
    expect(resolveVendureAssetUrl('vendure-assets/preview/98/image.png'))
      .toBe('https://shoptool.mn/assets/vendure-assets/preview/98/image.png');
  });

  it('rewrites private CDN asset URLs through the public asset route', () => {
    expect(resolveVendureAssetUrl('https://d2tf7pwvqo3y9.cloudfront.net/assets/vendure-assets/preview/a0/cover.png'))
      .toBe('https://shoptool.mn/assets/vendure-assets/preview/a0/cover.png');
  });

  it('keeps absolute and data URLs unchanged', () => {
    expect(resolveVendureAssetUrl('https://cdn.example.com/image.png'))
      .toBe('https://cdn.example.com/image.png');
    expect(resolveVendureAssetUrl('data:image/png;base64,abc'))
      .toBe('data:image/png;base64,abc');
  });

  it('accepts only a live supplier platform token', () => {
    setSupplierAuthToken(token({ role: 'SUPPLIER', exp: Math.floor(Date.now() / 1000) + 60 }));
    expect(hasSupplierAuthToken()).toBe(true);

    setSupplierAuthToken(token({ role: 'DRIVER', exp: Math.floor(Date.now() / 1000) + 60 }));
    expect(hasSupplierAuthToken()).toBe(false);

    setSupplierAuthToken(token({ role: 'SUPPLIER', exp: Math.floor(Date.now() / 1000) - 60 }));
    expect(hasSupplierAuthToken()).toBe(false);
  });
});
