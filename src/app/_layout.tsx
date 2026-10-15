import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Body, Heading, Muted, Screen } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { loading, session, profile } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
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

function NotConfigured() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <Screen>
      <Heading>Database not connected</Heading>
      <Body>
        Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in a .env file, then restart
        the app.
      </Body>
      <Muted>See the README for setup steps.</Muted>
    </Screen>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {isConfigured ? (
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      ) : (
        <NotConfigured />
      )}
    </ThemeProvider>
  );
}
