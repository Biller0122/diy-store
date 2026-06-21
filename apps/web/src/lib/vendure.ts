const PUBLIC_SHOP_API = process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? '/shop-api';
const PUBLIC_ADMIN_API = process.env.NEXT_PUBLIC_VENDURE_ADMIN_API ?? '/admin-api';
const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? '';
const AUTH_TOKEN_KEY = 'diy-vendure-auth-token';
const ADMIN_AUTH_TOKEN_KEY = 'diy-vendure-admin-auth-token';
const SUPPLIER_AUTH_TOKEN_KEY = 'diy-supplier-auth-token';

function getShopApi() {
  if (PUBLIC_SHOP_API.startsWith('http')) return PUBLIC_SHOP_API;
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_VENDURE_SHOP_API ?? 'http://localhost:13001/shop-api';
  }
  return PUBLIC_SHOP_API;
}

function getAdminApi() {
  if (PUBLIC_ADMIN_API.startsWith('http')) return PUBLIC_ADMIN_API;
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_VENDURE_ADMIN_API ?? 'http://localhost:13001/admin-api';
  }
  return PUBLIC_ADMIN_API;
}

function getVendureAuthToken() {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname.startsWith('/supplier')) {
    const supplierToken = window.localStorage.getItem(SUPPLIER_AUTH_TOKEN_KEY);
    if (isPlatformToken(supplierToken, 'SUPPLIER')) return supplierToken;
  }
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

// Платформ (supplier/driver) JWT мөн эсэх — body-д `role` талбартай гурван
// хэсэгтэй токен. Vendure-ийн `vendure-auth-token` нь үүнийг ДАРЖ БИЧИХЭЭС
// сэргийлнэ (эс бөгөөс supplier upload/update "Token буруу байна" өгдөг).
function isPlatformToken(token: string | null, expectedRole?: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = typeof atob === 'function' ? atob(json) : '';
    const body = JSON.parse(decoded) as { role?: unknown; exp?: unknown };
    if (typeof body.role !== 'string') return false;
    if (expectedRole && body.role !== expectedRole) return false;
    return typeof body.exp !== 'number' || body.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function setSupplierAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(SUPPLIER_AUTH_TOKEN_KEY, token);
  else window.localStorage.removeItem(SUPPLIER_AUTH_TOKEN_KEY);
}

export function hasSupplierAuthToken() {
  if (typeof window === 'undefined') return false;
  const dedicated = window.localStorage.getItem(SUPPLIER_AUTH_TOKEN_KEY);
  if (isPlatformToken(dedicated, 'SUPPLIER')) return true;

  // Migrate a valid token created before the dedicated supplier key existed.
  const legacy = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (!isPlatformToken(legacy, 'SUPPLIER')) return false;
  window.localStorage.setItem(SUPPLIER_AUTH_TOKEN_KEY, legacy!);
  return true;
}

export function resolveVendureAssetUrl(value?: string | null) {
  const source = value?.trim();
  if (!source) return '';
  if (/^(https?:|data:|blob:)/i.test(source)) return source;

  const relativePath = source.startsWith('/assets/')
    ? source
    : `/assets/${source.replace(/^\/+/, '').replace(/^assets\//, '')}`;

  try {
    if (PUBLIC_SHOP_API.startsWith('http')) return `${new URL(PUBLIC_SHOP_API).origin}${relativePath}`;
    if (PUBLIC_SITE_URL) return `${PUBLIC_SITE_URL}${relativePath}`;
    if (typeof window !== 'undefined') return `${window.location.origin}${relativePath}`;
  } catch {
    // Fall through to the relative path below.
  }
  return relativePath;
}

async function vendureHttpError(res: Response, label: string) {
  try {
    const body = await res.json() as { errors?: Array<{ message?: string }>; message?: string };
    const detail = body.errors?.[0]?.message || body.message;
    return new Error(detail ? `${label}: ${detail}` : `${label}: ${res.status}`);
  } catch {
    return new Error(`${label}: ${res.status}`);
  }
}

export function setVendureAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getVendureAdminAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ADMIN_AUTH_TOKEN_KEY);
}

export function clearVendureAuthToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function clearVendureAdminAuthToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
}

export async function vendureShopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { revalidate?: number },
): Promise<T> {
  const token = getVendureAuthToken();
  const res = await fetch(getShopApi(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'mn',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
    next: { revalidate: options?.revalidate ?? 60 },
  });

  if (!res.ok) {
    throw await vendureHttpError(res, 'Vendure API error');
  }

  const nextToken = res.headers.get('vendure-auth-token');
  // Supplier/driver JWT идэвхтэй үед Vendure-ийн session token-оор бүү дарж бич —
  // эс бөгөөс supplier upload/update "Token буруу байна" болно.
  if (nextToken && typeof window !== 'undefined' && !isPlatformToken(getVendureAuthToken())) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return json.data as T;
}

export async function vendureAdminFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = getVendureAdminAuthToken();
  const res = await fetch(getAdminApi(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'mn',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw await vendureHttpError(res, 'Vendure Admin API error');
  }

  const nextToken = res.headers.get('vendure-auth-token');
  if (nextToken && typeof window !== 'undefined') {
    window.localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, nextToken);
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return json.data as T;
}

export interface VendureCollection {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  customFields: { icon: string | null };
  children?: VendureCollection[];
  parent?: { id: string; name: string; slug: string } | null;
}
