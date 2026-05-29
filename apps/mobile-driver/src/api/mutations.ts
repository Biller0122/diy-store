export const LOGIN_DRIVER = `
  mutation LoginDriver($email: String!, $password: String!) {
    loginDriverByPassword(email: $email, password: $password) {
      success
      message
      driverId
      token
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
  mutation UpdateDriverLocation($id: ID!, $lat: Float!, $lng: Float!) {
    updateDriverLocation(id: $id, lat: $lat, lng: $lng) {
      id
      currentLat
      currentLng
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
