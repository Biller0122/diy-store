const API_URL = process.env.EXPO_PUBLIC_SHOP_API_URL || 'https://shop.example.com/shop-api';

export async function shopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message);
  }

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

export const REGISTER_MUTATION = `
  mutation Register($input: RegisterCustomerInput!) {
    registerCustomerAccount(input: $input) {
      ... on Success {
        success
      }
      ... on ErrorResult {
        errorCode
        message
      }
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
        featuredAsset {
          preview
        }
      }
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
      dropoffAddress: $dropoffAddress
      dropoffLat: $dropoffLat
      dropoffLng: $dropoffLng
      orderTotal: $orderTotal
      paymentMethod: $paymentMethod
    ) {
      id
      orderNumber
      status
    }
  }
`;

export const DELIVERY_REQUEST_QUERY = `
  query DeliveryRequest($orderId: String!) {
    deliveryRequest(orderId: $orderId) {
      id
      orderId
      orderNumber
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
