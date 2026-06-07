import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const IS_DEV = __DEV__;

function getHostIp() {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri?.split(':')[0] || 'localhost';
}

function getApiUrl() {
  if (!IS_DEV) {
    return 'https://api.diystore.mn';
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return `http://${getHostIp()}:3000`;
}

export const API_URL = getApiUrl();
