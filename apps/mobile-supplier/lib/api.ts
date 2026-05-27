const SHOP_API = 'http://52.77.245.218/shop-api';
const ADMIN_API = 'http://52.77.245.218/admin-api';

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
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
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
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

export const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const LOGOUT_MUTATION = `
  mutation Logout {
    logout {
      success
    }
  }
`;

export const ACTIVE_CUSTOMER_QUERY = `
  query ActiveCustomer {
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
    }
  }
`;

export const ADMIN_PRODUCTS_QUERY = `
  query AdminProducts($skip: Int!, $take: Int!) {
    products(options: { skip: $skip, take: $take }) {
      items {
        id
        name
        slug
        enabled
        variants {
          id
          price
          stockLevel
        }
      }
      totalItems
    }
  }
`;

export const ADMIN_ORDERS_QUERY = `
  query AdminOrders($state: String) {
    orders(options: {
      filter: { state: { eq: $state } },
      take: 20,
      sort: { createdAt: DESC }
    }) {
      items {
        id
        code
        state
        total
        createdAt
        lines {
          quantity
          productVariant {
            name
            product {
              name
            }
          }
        }
        shippingAddress {
          streetLine1
          city
        }
      }
      totalItems
    }
  }
`;

export const UPDATE_PRODUCT_MUTATION = `
  mutation UpdateProduct($id: ID!, $enabled: Boolean!) {
    updateProduct(input: { id: $id, enabled: $enabled }) {
      id
      enabled
    }
  }
`;

export const UPDATE_STOCK_MUTATION = `
  mutation UpdateProductVariants($input: [UpdateProductVariantInput!]!) {
    updateProductVariants(input: $input) {
      id
      stockOnHand
    }
  }
`;
