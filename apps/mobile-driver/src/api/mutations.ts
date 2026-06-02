export const LOGIN_DRIVER = `
  mutation LoginDriver($phone: String!) {
    loginDriver(phone: $phone) {
      success
      message
      phone
      otp
    }
  }
`;

export const LOGIN_DRIVER_BY_PASSWORD = `
  mutation LoginDriverByPassword($email: String!, $password: String!) {
    loginDriverByPassword(email: $email, password: $password) {
      success
      message
      driverId
      token
    }
  }
`;

export const VERIFY_DRIVER_OTP = `
  mutation VerifyDriverOTP($phone: String!, $otp: String!) {
    verifyDriverOTP(phone: $phone, otp: $otp) {
      success
      message
      driverId
      token
    }
  }
`;

export const REFRESH_DRIVER_TOKEN = `
  mutation RefreshDriverToken($id: ID!, $phone: String!) {
    refreshDriverToken(id: $id, phone: $phone) {
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
      otp
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

export const COMPLETE_DELIVERY_WITH_CODE = `
  mutation CompleteDeliveryWithCode($deliveryId: ID!, $driverId: String!, $code: String!) {
    completeDeliveryWithCode(deliveryId: $deliveryId, driverId: $driverId, code: $code) {
      id
      status
      driverId
    }
  }
`;
