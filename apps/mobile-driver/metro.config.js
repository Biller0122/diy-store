// Extends Expo's default Metro config for the driver app bundler.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
