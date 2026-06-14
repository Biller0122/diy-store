import { API_URL as BASE_API_URL, normalizeDeviceUrl } from '@/app/config';

const API_URL = process.env.EXPO_PUBLIC_SHOP_API_URL
  ? normalizeDeviceUrl(process.env.EXPO_PUBLIC_SHOP_API_URL)
  : `${BASE_API_URL.replace(/\/$/, '')}/shop-api`;
let sessionToken: string | null = null;

export function setShopSessionToken(token: string | null) {
  sessionToken = token;
}

export function getShopSessionToken() {
  return sessionToken;
}

export async function shopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const authToken = token ?? sessionToken;
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });

  const nextToken = response.headers.get('vendure-auth-token');
  if (nextToken) {
    sessionToken = nextToken;
  }

  const text = await response.text();
  let json: { data?: T; errors?: Array<{ message?: string }>; message?: string } | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Keep the raw body below so HTTP errors are still actionable.
  }

  if (!response.ok) {
    const message = json?.errors?.[0]?.message || json?.message || text || `HTTP error! status: ${response.status}`;
    throw new Error(message);
  }

  if (json?.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message);
  }

  if (!json?.data) {
    throw new Error('API-с хоосон хариу ирлээ');
  }

  return json.data;
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

export const PASSWORD_LOGIN_MUTATION = `
  mutation CustomerPasswordLogin($identifier: String!, $password: String!) {
    customerPasswordLogin(identifier: $identifier, password: $password) {
      success
      message
      token
      customer {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
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

export const REGISTER_MUTATION = `
  mutation CustomerPasswordRegister($input: CustomerPasswordRegisterInput!) {
    customerPasswordRegister(input: $input) {
      success
      message
      token
      customer {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
      }
    }
  }
`;

const CUSTOMER_AUTH_FIELDS = `
  success
  message
  token
  customer {
    id
    firstName
    lastName
    emailAddress
    phoneNumber
  }
`;

export const REQUEST_EMAIL_OTP_MUTATION = `
  mutation RequestCustomerEmailOtp($emailAddress: String!) {
    requestCustomerEmailOtp(emailAddress: $emailAddress) {
      success
      message
      otp
    }
  }
`;

export const VERIFY_EMAIL_OTP_MUTATION = `
  mutation VerifyCustomerEmailOtp($emailAddress: String!, $otp: String!) {
    verifyCustomerEmailOtp(emailAddress: $emailAddress, otp: $otp) {
      ${CUSTOMER_AUTH_FIELDS}
    }
  }
`;

export const REQUEST_PASSWORD_RESET_OTP_MUTATION = `
  mutation RequestCustomerPasswordResetOtp($emailAddress: String!) {
    requestCustomerPasswordResetOtp(emailAddress: $emailAddress) {
      success
      message
      otp
    }
  }
`;

export const RESET_PASSWORD_WITH_OTP_MUTATION = `
  mutation ResetCustomerPasswordWithOtp($emailAddress: String!, $otp: String!, $password: String!) {
    resetCustomerPasswordWithOtp(emailAddress: $emailAddress, otp: $otp, password: $password) {
      ${CUSTOMER_AUTH_FIELDS}
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
      phoneNumber
      addresses {
        id
        streetLine1
        city
        defaultShippingAddress
        defaultBillingAddress
      }
    }
  }
`;

export const PRODUCTS_QUERY = `
  query Products($options: ProductListOptions) {
    products(options: $options) {
      items {
        id
        name
        slug
        featuredAsset {
          preview
        }
        variants {
          id
          priceWithTax
          currencyCode
          stockLevel
        }
      }
      totalItems
    }
  }
`;

export const SEARCH_QUERY = `
  query Search($input: SearchInput!) {
    search(input: $input) {
      totalItems
      items {
        productId
        productVariantId
        productName
        slug
        productAsset {
          preview
        }
        priceWithTax {
          ... on SinglePrice {
            value
          }
        }
        inStock
      }
    }
  }
`;

export const SEMANTIC_SEARCH_QUERY = `
  query SemanticSearch($query: String!, $take: Int) {
    semanticSearch(query: $query, take: $take) {
      total
      items {
        id
        variantId
        name
        slug
        description
        category
        image
        price
        supplierId
        source
        score
      }
    }
  }
`;

export const PRODUCT_QUERY = `
  query Product($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        preview
      }
      variants {
        id
        name
        priceWithTax
        currencyCode
        stockLevel
        options {
          name
          code
        }
      }
      collections {
        id
        name
      }
    }
  }
`;

export const COLLECTIONS_QUERY = `
  query Collections($options: CollectionListOptions) {
    collections(options: $options) {
      items {
        id
        name
        slug
        description
        customFields {
          icon
        }
        featuredAsset {
          preview
        }
        children {
          id
          name
          slug
          customFields {
            icon
          }
          productVariants(options: { take: 1 }) {
            totalItems
          }
        }
        productVariants(options: { take: 1 }) {
          totalItems
        }
      }
    }
  }
`;

export const HOMEPAGE_BANNERS_QUERY = `
  query HomepageBanners {
    homepageBanners {
      id
      title
      subtitle
      eyebrow
      ctaLabel
      ctaHref
      imageUrl
      accentColor
    }
  }
`;

export const SUPPLIERS_QUERY = `
  query Suppliers($take: Int, $skip: Int) {
    suppliers(take: $take, skip: $skip) {
      items {
        id
        businessName
        slug
        rating
      }
      total
    }
  }
`;

export const SUPPLIER_PRODUCTS_QUERY = `
  query SupplierProducts($supplierId: String) {
    supplierProducts(supplierId: $supplierId) {
      total
      items {
        id
        supplierId
        name
        slug
        description
        category
        image
        price
        originalPrice
        stock
        enabled
      }
    }
  }
`;

export const SUPPLIER_BY_SLUG_QUERY = `
  query SupplierBySlug($slug: String!) {
    supplierBySlug(slug: $slug) {
      id
      businessName
      slug
      description
      phone
      address
      district
      lat
      lng
      rating
      reviewCount
      productCount
      pickupEnabled
      deliveryEnabled
    }
  }
`;

export const COLLECTION_BY_SLUG_QUERY = `
  query CollectionBySlug($slug: String!) {
    collection(slug: $slug) {
      id
      name
      slug
      customFields {
        icon
      }
      children {
        id
        name
        slug
        customFields {
          icon
        }
        productVariants(options: { take: 1 }) {
          totalItems
        }
      }
    }
  }
`;

export const SUPPLIER_QUERY = `
  query Supplier($id: ID!) {
    supplier(id: $id) {
      id
      businessName
      slug
      phone
      address
      district
      lat
      lng
    }
  }
`;

export const ACTIVE_ORDER_QUERY = `
  query ActiveOrder {
    activeOrder {
      id
      code
      state
      subTotal
      total
      lines {
        id
        quantity
        linePriceWithTax
        productVariant {
          id
          name
          priceWithTax
          product {
            name
            slug
            featuredAsset {
              preview
            }
          }
        }
      }
    }
  }
`;

export const ADD_TO_CART_MUTATION = `
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        lines {
          id
          quantity
          linePriceWithTax
          productVariant {
            id
            name
            priceWithTax
            product {
              name
              slug
              featuredAsset {
                preview
              }
            }
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const REMOVE_LINE_MUTATION = `
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ... on Order {
        id
        lines {
          id
          quantity
          linePriceWithTax
          productVariant {
            id
            name
            priceWithTax
            product {
              name
              slug
              featuredAsset {
                preview
              }
            }
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const ADJUST_LINE_MUTATION = `
  mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      ... on Order {
        id
        lines {
          id
          quantity
          linePriceWithTax
          productVariant {
            id
            name
            priceWithTax
            product {
              name
              slug
              featuredAsset {
                preview
              }
            }
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const SET_SHIPPING_ADDRESS_MUTATION = `
  mutation SetOrderShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      ... on Order {
        id
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const MY_ORDERS_QUERY = `
  query MyOrders {
    orders(options: { take: 20, sort: { createdAt: DESC } }) {
      items {
        id
        code
        state
        total
        createdAt
        lines {
          productVariant {
            product {
              name
            }
          }
        }
      }
      totalItems
    }
  }
`;

export const ELIGIBLE_SHIPPING_METHODS_QUERY = `
  query EligibleShippingMethods {
    eligibleShippingMethods {
      id
      name
      description
      priceWithTax
    }
  }
`;

export const SET_SHIPPING_METHOD_MUTATION = `
  mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
    setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
      ... on Order { id state }
      ... on ErrorResult { errorCode message }
    }
  }
`;

export const TRANSITION_ORDER_MUTATION = `
  mutation TransitionOrderToState($state: String!) {
    transitionOrderToState(state: $state) {
      ... on Order { id code state }
      ... on OrderStateTransitionError { errorCode message transitionError }
    }
  }
`;

export const CREATE_DELIVERY_REQUEST_MUTATION = `
  mutation CreateDeliveryRequest(
    $orderId: String!
    $customerId: String!
    $customerName: String!
    $customerPhone: String!
    $pickupStops: [PickupStopInput!]
    $orderItems: [DeliveryOrderItemInput!]
    $dropoffAddress: String!
    $dropoffLat: Float!
    $dropoffLng: Float!
    $orderTotal: Int
    $paymentMethod: String
  ) {
    createDeliveryRequest(
      orderId: $orderId
      customerId: $customerId
      customerName: $customerName
      customerPhone: $customerPhone
      pickupStops: $pickupStops
      orderItems: $orderItems
      dropoffAddress: $dropoffAddress
      dropoffLat: $dropoffLat
      dropoffLng: $dropoffLng
      orderTotal: $orderTotal
      paymentMethod: $paymentMethod
    ) {
      id
      orderId
      orderNumber
      trackingToken
      status
    }
  }
`;

export const DELIVERY_REQUEST_QUERY = `
  query DeliveryRequest($orderId: String!, $token: String) {
    deliveryRequest(orderId: $orderId, token: $token) {
      id
      orderId
      orderNumber
      trackingToken
      status
      driverId
      driverLat
      driverLng
      dropoffAddress
      dropoffLat
      dropoffLng
      estimatedDuration
      finalFee
      proposedFee
      createdAt
    }
  }
`;
