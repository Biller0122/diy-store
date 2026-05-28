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
