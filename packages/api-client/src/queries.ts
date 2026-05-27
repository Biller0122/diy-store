export const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      ... on CurrentUser {
        id
      }
      ... on InvalidCredentialsError {
        errorCode
        message
      }
      ... on NotVerifiedError {
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
      phoneNumber
      addresses {
        id
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country {
          code
          name
        }
        defaultShippingAddress
        defaultBillingAddress
      }
    }
  }
`;

export const REGISTER_MUTATION = `
  mutation Register($input: RegisterCustomerInput!) {
    registerCustomerAccount(input: $input) {
      ... on Success {
        success
      }
      ... on MissingPasswordError {
        errorCode
        message
      }
      ... on PasswordValidationError {
        errorCode
        message
        validationErrorMessage
      }
      ... on NativeAuthStrategyError {
        errorCode
        message
      }
    }
  }
`;

export const PRODUCTS_QUERY = `
  query Products($options: ProductListOptions) {
    products(options: $options) {
      totalItems
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
        }
      }
    }
  }
`;

export const PRODUCT_DETAIL_QUERY = `
  query ProductDetail($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        preview
      }
      assets {
        preview
      }
      collections {
        id
        name
        slug
        featuredAsset {
          preview
        }
        parent {
          id
          name
        }
      }
      variants {
        id
        name
        price
        priceWithTax
        currencyCode
        stockLevel
        options {
          id
          name
          code
        }
      }
    }
  }
`;

export const COLLECTIONS_QUERY = `
  query Collections {
    collections {
      totalItems
      items {
        id
        name
        slug
        featuredAsset {
          preview
        }
        parent {
          id
          name
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
      total
      totalWithTax
      currencyCode
      lines {
        id
        quantity
        linePriceWithTax
        featuredAsset {
          preview
        }
        productVariant {
          id
          name
          price
          priceWithTax
          currencyCode
          stockLevel
          options {
            id
            name
            code
          }
        }
      }
      shippingAddress {
        id
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country {
          code
          name
        }
      }
    }
  }
`;

export const ADD_TO_CART_MUTATION = `
  mutation AddToCart($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        lines {
          id
          quantity
          linePriceWithTax
          productVariant {
            id
            name
            priceWithTax
            currencyCode
          }
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
      ... on OrderLimitError {
        errorCode
        message
        maxItems
      }
      ... on NegativeQuantityError {
        errorCode
        message
      }
      ... on InsufficientStockError {
        errorCode
        message
        quantityAvailable
      }
    }
  }
`;

export const REMOVE_FROM_CART_MUTATION = `
  mutation RemoveFromCart($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        lines {
          id
          quantity
          linePriceWithTax
          productVariant {
            id
            name
            priceWithTax
            currencyCode
          }
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
    }
  }
`;

export const ADJUST_ORDER_LINE_MUTATION = `
  mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        lines {
          id
          quantity
          linePriceWithTax
          productVariant {
            id
            name
            priceWithTax
            currencyCode
          }
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
      ... on NegativeQuantityError {
        errorCode
        message
      }
      ... on InsufficientStockError {
        errorCode
        message
        quantityAvailable
      }
    }
  }
`;

export const SET_SHIPPING_ADDRESS_MUTATION = `
  mutation SetShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      ... on Order {
        id
        code
        state
        shippingAddress {
          fullName
          streetLine1
          streetLine2
          city
          province
          postalCode
          country {
            code
            name
          }
        }
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
    }
  }
`;

export const ADD_PAYMENT_MUTATION = `
  mutation AddPayment($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
      }
      ... on OrderPaymentStateError {
        errorCode
        message
      }
      ... on IneligiblePaymentMethodError {
        errorCode
        message
        eligibilityCheckerMessage
      }
      ... on PaymentFailedError {
        errorCode
        message
        paymentErrorMessage
      }
      ... on PaymentDeclinedError {
        errorCode
        message
        paymentErrorMessage
      }
      ... on OrderStateTransitionError {
        errorCode
        message
        transitionError
        fromState
        toState
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
    }
  }
`;

export const TRANSITION_ORDER_MUTATION = `
  mutation TransitionOrder($state: String!) {
    transitionOrderToState(state: $state) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
      }
      ... on OrderStateTransitionError {
        errorCode
        message
        transitionError
        fromState
        toState
      }
    }
  }
`;

export const MY_ORDERS_QUERY = `
  query MyOrders($options: OrderListOptions) {
    activeCustomer {
      orders(options: $options) {
        totalItems
        items {
          id
          code
          state
          total
          totalWithTax
          currencyCode
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const ORDER_DETAIL_QUERY = `
  query OrderDetail($id: ID!) {
    order(id: $id) {
      id
      code
      state
      total
      totalWithTax
      currencyCode
      createdAt
      updatedAt
      lines {
        id
        quantity
        linePriceWithTax
        featuredAsset {
          preview
        }
        productVariant {
          id
          name
          price
          priceWithTax
          currencyCode
          stockLevel
          options {
            id
            name
            code
          }
        }
      }
      shippingAddress {
        id
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country {
          code
          name
        }
        defaultShippingAddress
        defaultBillingAddress
      }
    }
  }
`;
