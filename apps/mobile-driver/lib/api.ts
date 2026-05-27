const API_URL = 'http://52.77.245.218';
const SHOP_API = `${API_URL}/shop-api`;

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
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'API алдаа');
  return json.data as T;
}

export const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password, rememberMe: true) {
      ... on CurrentUser { id identifier }
      ... on InvalidCredentialsError { errorCode message }
      ... on NativeAuthStrategyError { errorCode message }
    }
  }
`;

export const ACTIVE_CUSTOMER_QUERY = `
  query ActiveCustomer {
    activeCustomer {
      id firstName lastName emailAddress phoneNumber
    }
  }
`;

export const LOGOUT_MUTATION = `mutation Logout { logout { success } }`;
