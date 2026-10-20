import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
  useFonts,
} from '@expo-google-fonts/cormorant-garamond';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors, HeaderOptions } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { initCrashReporting, wrapRoot } from '@/lib/sentry';

initCrashReporting();
SplashScreen.preventAutoHideAsync();

const theme = Colors.dark;

// Navigation headers and backgrounds in the Midnight gold palette.
const NavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.accent,
    background: theme.background,
    card: theme.background,
    text: theme.text,
    border: theme.divider,
  },
};

function RootStack({ fontsReady }: { fontsReady: boolean }) {
  const { loading, session, profile } = useAuth();
  const ready = !loading && fontsReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={HeaderOptions}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !profile}>
        <Stack.Screen name="setup-profile" options={{ title: 'Your breeder profile' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !!profile}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  const [loaded, error] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
  });
  return (
    <ThemeProvider value={NavTheme}>
      <StatusBar style="light" />
      <AuthProvider>
        <RootStack fontsReady={loaded || !!error} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default wrapRoot(RootLayout);
