const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

module.exports = {
  expo: {
    name: 'DIY Store Жолооч',
    slug: 'diy-store-driver',
    scheme: 'diystore-driver',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
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
      package: 'mn.diystore.driver',
      ...(googleMapsApiKey
        ? {
            config: {
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            },
          }
        : {}),
      adaptiveIcon: {
        backgroundColor: '#08080E',
      },
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'mn.diystore.driver',
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: process.env.NODE_ENV !== 'production',
        },
      },
      ...(googleMapsApiKey
        ? {
            config: {
              googleMapsApiKey,
            },
          }
        : {}),
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    experiments: {
      typedRoutes: true,
    },
  },
};
