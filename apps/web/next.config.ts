import type { NextConfig } from 'next';
import { validateWebEnv } from './src/lib/env-validation';

validateWebEnv();

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
];

function localVendureUrl(envValue: string | undefined, fallback: string) {
  if (process.env.NODE_ENV !== 'production' && envValue?.startsWith('http://server:')) {
    return envValue.replace('http://server:', 'http://localhost:');
  }
  return envValue || fallback;
}

const shopApiUrl = localVendureUrl(process.env.INTERNAL_VENDURE_SHOP_API, 'http://localhost:13001/shop-api');
const adminApiUrl = localVendureUrl(process.env.INTERNAL_VENDURE_ADMIN_API, 'http://localhost:13001/admin-api');
const assetsUrl = localVendureUrl(process.env.INTERNAL_VENDURE_ASSETS, 'http://localhost:13001/assets/:path*');
const mailboxUrl = localVendureUrl(process.env.INTERNAL_VENDURE_MAILBOX, 'http://localhost:13001/mailbox/:path*');

const nextConfig: NextConfig = {
  compress: true,
  output: 'standalone',
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1', '172.18.128.1'],

  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost', port: '13001', pathname: '/assets/**' },
      { protocol: 'http',  hostname: '127.0.0.1', port: '13001', pathname: '/assets/**' },
      { protocol: 'https', hostname: '*.algolia.net' },
      { protocol: 'https', hostname: '*.algolianet.com' },
      { protocol: 'https', hostname: '*.cloudfront.net', pathname: '/**' },
      { protocol: 'https', hostname: 'shoptool.mn', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.shoptool.mn', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },

  async rewrites() {
    return [
      { source: '/shop-api',           destination: shopApiUrl },
      { source: '/admin-api',          destination: adminApiUrl },
      { source: '/assets/:path*',      destination: assetsUrl },
      { source: '/mailbox/:path*',     destination: mailboxUrl },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-accordion'],
  },
};

export default nextConfig;
