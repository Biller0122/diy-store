const SHOP_API = 'http://52.77.245.218/shop-api';

export async function shopFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(SHOP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'API алдаа');
  return json.data as T;
}

export const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      ... on CurrentUser { id identifier }
      ... on ErrorResult { errorCode message }
    }
  }
`;

export const ACTIVE_CUSTOMER_QUERY = `
  query {
    activeCustomer {
      id firstName lastName emailAddress phoneNumber
    }
  }
`;

export const LOGOUT_MUTATION = `
  mutation {
    logout { success }
  }
`;

export const REGISTER_DRIVER_MUTATION = `
  mutation RegisterDriver($ownerName: String!, $phone: String!) {
    registerDriver(ownerName: $ownerName, phone: $phone) {
      success
      message
      phone
    }
  }
`;

export const LOGIN_DRIVER_MUTATION = `
  mutation LoginDriver($phone: String!) {
    loginDriver(phone: $phone) {
      success
      message
      phone
    }
  }
`;

export const LOGIN_DRIVER_BY_PASSWORD_MUTATION = `
  mutation LoginDriverByPassword($email: String!, $password: String!) {
    loginDriverByPassword(email: $email, password: $password) {
      success
      message
      driverId
      token
    }
  }
`;

export const VERIFY_DRIVER_OTP_MUTATION = `
  mutation VerifyDriverOTP($phone: String!, $otp: String!) {
    verifyDriverOTP(phone: $phone, otp: $otp) {
      success
      message
      driverId
      token
    }
  }
`;

export const DRIVER_PROFILE_QUERY = `
  query DriverProfile($id: ID!) {
    getDriverProfile(id: $id) {
      id
      firstName
      lastName
      phone
      vehicleType
      vehiclePlate
      vehicleModel
      status
      isOnline
      currentLat
      currentLng
      rating
      totalDeliveries
      todayEarnings
      totalEarnings
      bankName
      bankAccount
    }
  }
`;

export const SET_ONLINE_STATUS_MUTATION = `
  mutation SetOnlineStatus($id: ID!, $isOnline: Boolean!) {
    setOnlineStatus(id: $id, isOnline: $isOnline) {
      id
      isOnline
      status
    }
  }
`;
