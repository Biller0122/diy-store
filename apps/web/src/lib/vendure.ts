const PUBLIC_SHOP_API = process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? '/shop-api';
const AUTH_TOKEN_KEY = 'diy-vendure-auth-token';

function getShopApi() {
  if (PUBLIC_SHOP_API.startsWith('http')) return PUBLIC_SHOP_API;
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_VENDURE_SHOP_API ?? 'http://localhost:3001/shop-api';
  }
  return PUBLIC_SHOP_API;
}

function getVendureAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearVendureAuthToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function vendureShopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
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
    next: { revalidate: 60 },
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

export interface VendureCollection {
  id: string;
  name: string;
  slug: string;
  customFields: { icon: string | null };
}
