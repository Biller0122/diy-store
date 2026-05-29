export const LOGIN_DRIVER = `
  mutation LoginDriver($email: String!, $password: String!) {
    login(username: $email, password: $password) {
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

export const REGISTER_DRIVER = `
  mutation RegisterDriver($input: RegisterDriverInput!) {
    registerDriver(input: $input) {
      success
      message
      phone
    }
  }
`;

export const UPDATE_DRIVER_STATUS = `
  mutation UpdateDriverStatus($id: ID!, $isOnline: Boolean!) {
    setOnlineStatus(id: $id, isOnline: $isOnline) {
      id
      isOnline
      status
    }
  }
`;

export const UPDATE_DRIVER_LOCATION = `
  mutation UpdateDriverLocation($driverId: ID!, $lat: Float!, $lng: Float!, $heading: Float, $orderId: ID) {
    updateDriverLocation(driverId: $driverId, lat: $lat, lng: $lng, heading: $heading, orderId: $orderId) {
      success
    }
  }
`;

export const ACCEPT_DELIVERY = `
  mutation AcceptDelivery($driverId: ID!, $orderId: ID!) {
    acceptDelivery(driverId: $driverId, orderId: $orderId) {
      success
      message
    }
  }
`;

export const REJECT_DELIVERY = `
  mutation RejectDelivery($driverId: ID!, $orderId: ID!) {
    rejectDelivery(driverId: $driverId, orderId: $orderId) {
      success
      message
    }
  }
`;

export const UPDATE_ORDER_STATUS = `
  mutation UpdateOrderStatus($orderId: ID!, $status: String!, $driverId: ID!) {
    updateOrderStatus(orderId: $orderId, status: $status, driverId: $driverId) {
      success
      message
    }
  }
`;
