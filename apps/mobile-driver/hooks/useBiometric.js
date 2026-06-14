// Provides SecureStore-backed biometric authentication helpers for driver login.
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';
const BIOMETRIC_DRIVER_ID_KEY = 'biometric_driver_id';

export async function checkSupport() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const hasBiometricType = supportedTypes.some((type) =>
    type === LocalAuthentication.AuthenticationType.FINGERPRINT ||
    type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
  );
  const hasBiometricEnrollment =
    enrolledLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK ||
    enrolledLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;

  return hasHardware && isEnrolled && hasBiometricType && hasBiometricEnrollment;
}

export async function authenticate() {
  return LocalAuthentication.authenticateAsync({
    promptMessage: 'Нэвтрэхийн тулд баталгаажуулна уу',
    fallbackLabel: 'Нууц үг ашиглах',
    cancelLabel: 'Болих',
    disableDeviceFallback: false,
  });
}

export async function enableBiometric(token, driverId) {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
  if (driverId) {
    await SecureStore.setItemAsync(BIOMETRIC_DRIVER_ID_KEY, driverId);
  }
}

export async function isBiometricEnabled() {
  return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === 'true';
}

export async function disableBiometric() {
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_DRIVER_ID_KEY);
}

export async function getBiometricToken() {
  return SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
}

export async function getBiometricDriverId() {
  return SecureStore.getItemAsync(BIOMETRIC_DRIVER_ID_KEY);
}
