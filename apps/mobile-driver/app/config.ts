import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const IS_DEV = __DEV__;
const DEV_SERVER_PORT = 13001;
const PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;
const PUBLIC_DEV_SERVER_HOST = process.env.EXPO_PUBLIC_DEV_SERVER_HOST;

function getHostIp() {
  if (PUBLIC_DEV_SERVER_HOST) {
    return PUBLIC_DEV_SERVER_HOST.replace(/^https?:\/\//, '').split(':')[0];
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;
  return hostUri?.split(':')[0] || 'localhost';
}

function getApiUrl() {
  if (PUBLIC_API_URL) {
    return normalizeDeviceUrl(PUBLIC_API_URL);
  }

  if (!IS_DEV) {
    return 'https://shoptool.mn';
  }

  const hostIp = getHostIp();
  if (Platform.OS === 'android' && (hostIp === 'localhost' || hostIp === '127.0.0.1')) {
    return `http://10.0.2.2:${DEV_SERVER_PORT}`;
  }

  return `http://${hostIp}:${DEV_SERVER_PORT}`;
}

export function normalizeDeviceUrl(value: string) {
  const trimmed = value.replace(/\/$/, '');
  if (!IS_DEV || Platform.OS === 'web') return trimmed;

  try {
    const url = new URL(trimmed);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (isLocalhost) {
      const hostIp = getHostIp();
      url.hostname = Platform.OS === 'android' && (hostIp === 'localhost' || hostIp === '127.0.0.1')
        ? '10.0.2.2'
        : hostIp;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export const API_URL = getApiUrl();
