import type { NextConfig } from 'next';

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

const shopApiUrl = localVendureUrl(process.env.INTERNAL_VENDURE_SHOP_API, 'http://localhost:3001/shop-api');
const adminApiUrl = localVendureUrl(process.env.INTERNAL_VENDURE_ADMIN_API, 'http://localhost:3001/admin-api');
const assetsUrl = localVendureUrl(process.env.INTERNAL_VENDURE_ASSETS, 'http://localhost:3001/assets/:path*');
const mailboxUrl = localVendureUrl(process.env.INTERNAL_VENDURE_MAILBOX, 'http://localhost:3001/mailbox/:path*');

const nextConfig: NextConfig = {
  compress: true,
  output: 'standalone',
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost', port: '3001', pathname: '/assets/**' },
      { protocol: 'http',  hostname: '52.77.245.218', port: '8080', pathname: '/assets/**' },
      { protocol: 'https', hostname: '*.algolia.net' },
      { protocol: 'https', hostname: '*.algolianet.com' },
      { protocol: 'https', hostname: 'diy-store.mn', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.diy-store.mn', pathname: '/**' },
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
