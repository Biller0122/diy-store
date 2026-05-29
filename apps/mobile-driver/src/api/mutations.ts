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
  mutation AcceptDelivery($deliveryId: ID!, $driverId: String!) {
    acceptDelivery(deliveryId: $deliveryId, driverId: $driverId) {
      id
      status
      driverId
    }
  }
`;

export const REJECT_DELIVERY = `
  mutation RejectDelivery($deliveryId: ID!, $driverId: String!) {
    rejectDelivery(deliveryId: $deliveryId, driverId: $driverId) {
      id
      status
      driverId
    }
  }
`;

export const UPDATE_DELIVERY_STATUS = `
  mutation UpdateDeliveryStatus($deliveryId: ID!, $status: String!) {
    updateDeliveryStatus(deliveryId: $deliveryId, status: $status) {
      id
      status
      driverId
    }
  }
`;
