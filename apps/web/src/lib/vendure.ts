const PUBLIC_SHOP_API = process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? '/shop-api';
const PUBLIC_ADMIN_API = process.env.NEXT_PUBLIC_VENDURE_ADMIN_API ?? '/admin-api';
const AUTH_TOKEN_KEY = 'diy-vendure-auth-token';
const ADMIN_AUTH_TOKEN_KEY = 'diy-vendure-admin-auth-token';

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
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setVendureAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function getVendureAdminAuthToken() {
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
    throw new Error(`Vendure API error: ${res.status}`);
  }

  const nextToken = res.headers.get('vendure-auth-token');
  if (nextToken && typeof window !== 'undefined') {
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
    throw new Error(`Vendure Admin API error: ${res.status}`);
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
