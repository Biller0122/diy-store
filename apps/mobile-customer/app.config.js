const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';

module.exports = {
  expo: {
    name: 'DIY Store',
    slug: 'diy-store-customer',
    version: '1.0.0',
    scheme: 'diy-store',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/icon.png',
      backgroundColor: '#08080E',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'mn.diy.customer',
      buildNumber: '1',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'Хүргэлтийн хаяг болон захиалгын явцыг газрын зураг дээр зөв харуулахын тулд таны байршлыг ашиглана.',
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: !isProduction,
        },
      },
    },
    android: {
      package: 'mn.diy.customer',
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
