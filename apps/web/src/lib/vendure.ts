const SHOP_API =
  process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? 'http://localhost:3001/shop-api';

export async function vendureShopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(SHOP_API, {
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
