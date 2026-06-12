const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';

module.exports = {
  expo: {
    name: 'DIY Нийлүүлэгч',
    slug: 'diy-supplier',
    version: '1.0.0',
    scheme: 'diy-supplier',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: { backgroundColor: '#08080E' },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'mn.diy.supplier',
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: !isProduction,
        },
        NSPhotoLibraryUsageDescription: 'Барааны зураг сонгож бүтээгдэхүүн нэмэхэд ашиглана.',
        NSCameraUsageDescription: 'Барааны зураг авч бүтээгдэхүүн нэмэхэд ашиглана.',
      },
    },
    android: {
      package: 'mn.diy.supplier',
      adaptiveIcon: { backgroundColor: '#08080E' },
      permissions: ['CAMERA', 'READ_MEDIA_IMAGES'],
    },
    web: { favicon: './assets/favicon.png', bundler: 'metro' },
    plugins: [
      'expo-router',
      [
        'expo-image-picker',
        {
          photosPermission: 'Барааны зураг сонгож бүтээгдэхүүн нэмэхэд ашиглана.',
          cameraPermission: 'Барааны зураг авч бүтээгдэхүүн нэмэхэд ашиглана.',
        },
      ],
    ],
    experiments: { typedRoutes: true },
  },
};
