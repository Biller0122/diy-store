const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const API_BASE = (runtimeEnv?.NEXT_PUBLIC_API_URL || runtimeEnv?.EXPO_PUBLIC_API_URL || 'https://shoptool.mn').replace(/\/$/, '');

export const SHOP_API = runtimeEnv?.NEXT_PUBLIC_SHOP_API_URL || runtimeEnv?.EXPO_PUBLIC_SHOP_API_URL || `${API_BASE}/shop-api`;
export const ADMIN_API = runtimeEnv?.NEXT_PUBLIC_ADMIN_API_URL || runtimeEnv?.EXPO_PUBLIC_ADMIN_API_URL || `${API_BASE}/admin-api`;

export async function shopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(SHOP_API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Shop API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

export async function adminFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(ADMIN_API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}
