import type { ConfigContext, ExpoConfig } from 'expo/config';

const rawGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const googleMapsApiKey = rawGoogleMapsApiKey && !rawGoogleMapsApiKey.startsWith('$') ? rawGoogleMapsApiKey : '';
const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'DIY Store Жолооч',
  slug: 'diy-store-driver',
  scheme: 'diystore-driver',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    backgroundColor: '#08080E',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Захиалга хүргэх үед байршлыг ашиглана',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#FF4500',
      },
    ],
    'expo-secure-store',
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Нүүр таних замаар нэвтрэхийг зөвшөөрнө үү',
      },
    ],
  ],
  android: {
    ...config.android,
    package: 'mn.diystore.driver',
    versionCode: 1,
    ...(googleMapsApiKey
      ? {
          config: {
            ...config.android?.config,
            googleMaps: {
              ...config.android?.config?.googleMaps,
              apiKey: googleMapsApiKey,
            },
          },
        }
      : {}),
    adaptiveIcon: {
      ...config.android?.adaptiveIcon,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#08080E',
    },
  },
  ios: {
    ...config.ios,
    supportsTablet: false,
    bundleIdentifier: 'mn.diystore.driver',
    buildNumber: '1',
    infoPlist: {
      ...config.ios?.infoPlist,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: !isProduction,
      },
    },
    ...(googleMapsApiKey
      ? {
          config: {
            ...config.ios?.config,
            googleMapsApiKey,
          },
        }
      : {}),
  },
  web: {
    ...config.web,
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  experiments: {
    ...config.experiments,
    typedRoutes: true,
  },
});
