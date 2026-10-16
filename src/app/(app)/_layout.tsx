import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan tank QR', presentation: 'modal' }} />
      <Stack.Screen name="tanks/new" options={{ title: 'New tank' }} />
      <Stack.Screen name="tanks/[id]/index" options={{ title: 'Tank' }} />
      <Stack.Screen name="tanks/[id]/edit" options={{ title: 'Edit tank' }} />
      <Stack.Screen name="tanks/[id]/water-test" options={{ title: 'Water test' }} />
      <Stack.Screen name="tanks/[id]/water-change" options={{ title: 'Water change' }} />
      <Stack.Screen name="tanks/[id]/qr" options={{ title: 'Tank QR code' }} />
      <Stack.Screen name="tanks/[id]/add-fish" options={{ title: 'Move fish here' }} />
      <Stack.Screen
        name="tanks/[id]/quick"
        options={{
          headerShown: false,
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="fish/new" options={{ title: 'New fish' }} />
      <Stack.Screen name="fish/[id]/index" options={{ title: 'Fish' }} />
      <Stack.Screen name="fish/[id]/edit" options={{ title: 'Edit fish' }} />
      <Stack.Screen name="fish/[id]/move" options={{ title: 'Move fish' }} />
      <Stack.Screen name="fish/[id]/pedigree" options={{ title: 'Pedigree' }} />
      <Stack.Screen name="fish/[id]/trait" options={{ title: 'Trait' }} />
      <Stack.Screen name="fish/[id]/evaluation" options={{ title: 'IHS evaluation' }} />
      <Stack.Screen name="groups/index" options={{ title: 'Breeding groups' }} />
      <Stack.Screen name="groups/new" options={{ title: 'New breeding group' }} />
      <Stack.Screen name="groups/[id]/index" options={{ title: 'Breeding group' }} />
      <Stack.Screen name="groups/[id]/edit" options={{ title: 'Edit group' }} />
      <Stack.Screen name="strains/[name]" options={{ title: 'Strain' }} />
      <Stack.Screen name="spawns/index" options={{ title: 'Spawns' }} />
      <Stack.Screen name="spawns/new" options={{ title: 'New spawn' }} />
      <Stack.Screen name="spawns/[id]/index" options={{ title: 'Spawn' }} />
      <Stack.Screen name="spawns/[id]/edit" options={{ title: 'Edit spawn' }} />
      <Stack.Screen name="spawns/[id]/event" options={{ title: 'Batch log' }} />
      <Stack.Screen name="spawns/[id]/pick" options={{ title: 'Pick a fish' }} />
      <Stack.Screen name="spawns/[id]/pick-many" options={{ title: 'Pick several fish' }} />
    </Stack>
  );
}
