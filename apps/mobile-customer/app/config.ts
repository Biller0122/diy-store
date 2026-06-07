import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const IS_DEV = __DEV__;
const DEV_SERVER_PORT = 13001;

function getHostIp() {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri?.split(':')[0] || 'localhost';
}

function getApiUrl() {
  if (!IS_DEV) {
    return 'https://api.diystore.mn';
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEV_SERVER_PORT}`;
  }

  return `http://${getHostIp()}:${DEV_SERVER_PORT}`;
}

export const API_URL = getApiUrl();
