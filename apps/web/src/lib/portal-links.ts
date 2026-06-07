type Portal = 'customer' | 'admin' | 'driver' | 'merchant';

const LOCAL_PORTS: Record<Portal, number> = {
  customer: 18080,
  admin: 18081,
  driver: 18082,
  merchant: 18083,
};

const PUBLIC_URLS: Record<Portal, string | undefined> = {
  customer: process.env.NEXT_PUBLIC_CUSTOMER_URL,
  admin: process.env.NEXT_PUBLIC_ADMIN_URL,
  driver: process.env.NEXT_PUBLIC_DRIVER_URL,
  merchant: process.env.NEXT_PUBLIC_MERCHANT_URL || process.env.NEXT_PUBLIC_SUPPLIER_URL,
};

function isLocalUrl(value: string | undefined) {
  return value?.startsWith('http://localhost')
    || value?.startsWith('https://localhost')
    || value?.startsWith('http://127.0.0.1')
    || value?.startsWith('https://127.0.0.1');
}

export function getPortalHref(portal: Portal, path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (isLocalUrl(process.env.NEXT_PUBLIC_SITE_URL)) {
    return `http://localhost:${LOCAL_PORTS[portal]}${normalizedPath}`;
  }

  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `${window.location.protocol}//${window.location.hostname}:${LOCAL_PORTS[portal]}${normalizedPath}`;
  }

  const configured = PUBLIC_URLS[portal]?.replace(/\/$/, '');
  return configured ? `${configured}${normalizedPath}` : normalizedPath;
}

export function getCustomerHomeHref() {
  return getPortalHref('customer', '/');
}
