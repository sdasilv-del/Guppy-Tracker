import { Stack } from 'expo-router';

import { HeaderOptions } from '@/constants/theme';

export default function Layout() {
  return (
    <Stack screenOptions={HeaderOptions}>
      <Stack.Screen name="index" options={{ title: 'Breeding', headerLargeTitle: true }} />
    </Stack>
  );
}
