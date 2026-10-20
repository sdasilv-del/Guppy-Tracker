import * as Sentry from '@sentry/react-native';

// Crash reporting. Off unless EXPO_PUBLIC_SENTRY_DSN is set, so local
// development and Expo Go run exactly as before.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const crashReportingEnabled = !!dsn;

export function initCrashReporting() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
  });
}

export const wrapRoot = Sentry.wrap;
