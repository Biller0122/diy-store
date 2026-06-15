const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';

module.exports = {
  expo: {
    name: 'SHOPTOOL',
    slug: 'diy-store-customer',
    owner: 'odbayar0122',
    extra: {
      eas: {
        projectId: '31690257-5a08-438d-bfb4-612f99074570',
      },
    },
    version: '1.0.0',
    scheme: 'shoptool',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/icon.png',
      backgroundColor: '#08080E',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'mn.shoptool.customer',
      buildNumber: '1',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'Хүргэлтийн хаяг болон захиалгын явцыг газрын зураг дээр зөв харуулахын тулд таны байршлыг ашиглана.',
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: !isProduction,
        },
      },
    },
    android: {
      package: 'mn.shoptool.customer',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#08080E',
      },
    },
    web: { favicon: './assets/favicon.png', bundler: 'metro' },
    plugins: ['expo-router'],
    experiments: { typedRoutes: true },
  },
};
