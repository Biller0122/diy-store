const PUBLIC_SHOP_API = process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? '/shop-api';

function getShopApi() {
  if (PUBLIC_SHOP_API.startsWith('http')) return PUBLIC_SHOP_API;
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_VENDURE_SHOP_API ?? 'http://localhost:3001/shop-api';
  }
  return PUBLIC_SHOP_API;
}

export async function vendureShopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(getShopApi(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'mn',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Vendure API error: ${res.status}`);
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
