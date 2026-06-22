// Stores and retrieves authentication tokens securely for the driver app.
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_DRIVER_ID_KEY = 'auth_driver_id';

export async function saveToken(token) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function saveDriverId(driverId) {
  await SecureStore.setItemAsync(AUTH_DRIVER_ID_KEY, driverId);
}

export async function getDriverId() {
  return SecureStore.getItemAsync(AUTH_DRIVER_ID_KEY);
}

export async function deleteDriverId() {
  await SecureStore.deleteItemAsync(AUTH_DRIVER_ID_KEY);
}
