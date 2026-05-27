import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
];

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
      { source: '/shop-api',           destination: 'http://server:3001/shop-api' },
      { source: '/admin-api',          destination: 'http://server:3001/admin-api' },
      { source: '/assets/:path*',      destination: 'http://server:3001/assets/:path*' },
      { source: '/mailbox/:path*',     destination: 'http://server:3001/mailbox/:path*' },
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
