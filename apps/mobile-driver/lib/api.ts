const SHOP_API = 'http://52.77.245.218/shop-api';

export async function shopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(SHOP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'API алдаа');
  return json.data as T;
}

export const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      ... on CurrentUser { id identifier }
      ... on ErrorResult { errorCode message }
    }
  }
`;

export const ACTIVE_CUSTOMER_QUERY = `
  query {
    activeCustomer {
      id firstName lastName emailAddress phoneNumber
    }
  }
`;

export const LOGOUT_MUTATION = `
  mutation {
    logout { success }
  }
`;
