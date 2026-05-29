const SHOP_API = process.env.EXPO_PUBLIC_SHOP_API_URL || 'http://192.168.0.13:3001/shop-api';
const ADMIN_API = process.env.EXPO_PUBLIC_ADMIN_API_URL || 'http://192.168.0.13:3001/admin-api';
const REQUEST_TIMEOUT_MS = 12000;

async function postGraphql<T>(
  url: string,
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`API холболтын алдаа (${res.status})`);
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Серверээс хариу ирсэнгүй. Дахин оролдоно уу');
    }
    if (err instanceof TypeError) {
      throw new Error('API сервертэй холбогдож чадсангүй. Интернэт болон серверийн хаягийг шалгана уу');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function shopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  return postGraphql<T>(SHOP_API, query, variables, token);
}

export async function adminFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  return postGraphql<T>(ADMIN_API, query, variables, token);
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

export const LOGIN_SUPPLIER_MUTATION = `
  mutation LoginSupplier($email: String!) {
    loginSupplier(email: $email) {
      success
      message
      email
    }
  }
`;

export const REGISTER_SUPPLIER_MUTATION = `
  mutation RegisterSupplier($input: RegisterSupplierInput!) {
    registerSupplier(input: $input) {
      success
      message
      email
    }
  }
`;

export const VERIFY_SUPPLIER_OTP_MUTATION = `
  mutation VerifySupplierOTP($input: VerifySupplierOTPInput!) {
    verifySupplierOTP(input: $input) {
      success
      message
      supplierId
      token
    }
  }
`;

export const SUPPLIER_QUERY = `
  query Supplier($id: ID!) {
    supplier(id: $id) {
      id
      businessName
      ownerName
      email
      phone
      status
      productCount
      rating
    }
  }
`;

export const SUPPLIER_PRODUCTS_QUERY = `
  query SupplierProducts($supplierId: String) {
    supplierProducts(supplierId: $supplierId) {
      items {
        id
        supplierId
        name
        slug
        description
        category
        image
        enabled
        price
        originalPrice
        stock
        createdAt
        updatedAt
      }
      total
    }
  }
`;

export const CREATE_SUPPLIER_PRODUCT_MUTATION = `
  mutation CreateSupplierProduct($input: SupplierProductInput!) {
    createSupplierProduct(input: $input) {
      id
      supplierId
      name
      slug
      description
      category
      image
      enabled
      price
      originalPrice
      stock
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SUPPLIER_PRODUCT_MUTATION = `
  mutation UpdateSupplierProduct($id: ID!, $input: SupplierProductUpdateInput!) {
    updateSupplierProduct(id: $id, input: $input) {
      id
      enabled
      stock
      price
    }
  }
`;

export const SUPPLIER_ORDERS_QUERY = `
  query SupplierOrders($skip: Int, $take: Int) {
    supplierOrders(skip: $skip, take: $take) {
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
      total
    }
  }
`;

export const SUPPLIER_ORDER_ACTION_MUTATION = `
  mutation SupplierOrderAction($orderId: ID!, $action: String!) {
    supplierOrderAction(orderId: $orderId, action: $action) {
      success
      message
      order {
        id
        code
        state
        total
        createdAt
        shippingAddress {
          streetLine1
          city
        }
        lines {
          quantity
          productVariant {
            name
            product {
              name
            }
          }
        }
      }
    }
  }
`;
