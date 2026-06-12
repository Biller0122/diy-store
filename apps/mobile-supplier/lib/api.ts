import { API_URL, WEB_URL, normalizeDeviceUrl } from '@/lib/config';
import { Platform } from 'react-native';

const SHOP_API = Platform.OS === 'web'
  ? `${API_URL}/shop-api`
  : process.env.EXPO_PUBLIC_SHOP_API_URL
    ? normalizeDeviceUrl(process.env.EXPO_PUBLIC_SHOP_API_URL)
    : `${API_URL}/shop-api`;
const ADMIN_API = Platform.OS === 'web'
  ? `${API_URL}/admin-api`
  : process.env.EXPO_PUBLIC_ADMIN_API_URL
    ? normalizeDeviceUrl(process.env.EXPO_PUBLIC_ADMIN_API_URL)
    : `${API_URL}/admin-api`;
const REQUEST_TIMEOUT_MS = 30000;
const AI_ANALYZE_TIMEOUT_MS = 35000;

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

export type ProductAnalysis = {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  confidence?: number;
  error?: string;
};

export async function analyzeProductImage(image: string, category?: string): Promise<ProductAnalysis> {
  async function postAnalyze(baseUrl: string, signal: AbortSignal) {
    const mediaType = image.match(/^data:([^;]+);base64,/)?.[1] || 'image/jpeg';
    const response = await fetch(`${baseUrl}/analyze-product`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        mediaType,
        ...(category ? { category } : {}),
      }),
    });
    const json = await response.json();
    if (!response.ok || json?.error) {
      throw new Error(json?.error || `AI шинжилгээний алдаа (${response.status})`);
    }
    return json as ProductAnalysis;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_ANALYZE_TIMEOUT_MS);
  try {
    try {
      return await postAnalyze(WEB_URL, controller.signal);
    } catch (err) {
      if (WEB_URL === API_URL) throw err;
      return await postAnalyze(API_URL, controller.signal);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI шинжилгээ хэт удаж байна. Дахин оролдоно уу');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
      otp
    }
  }
`;

export const REGISTER_SUPPLIER_MUTATION = `
  mutation RegisterSupplier($input: RegisterSupplierInput!) {
    registerSupplier(input: $input) {
      success
      message
      email
      otp
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
