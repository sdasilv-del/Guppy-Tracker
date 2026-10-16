import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Breeding', headerLargeTitle: true }} />
    </Stack>
  );
}
