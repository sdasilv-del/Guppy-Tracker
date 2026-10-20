// Sentry's Expo config wraps Expo's default Metro config and tags each bundle
// with a debug ID so crash reports map back to the original source.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
