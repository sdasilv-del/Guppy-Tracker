import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <NativeTabs tintColor={theme.accent}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tanks">
        <NativeTabs.Trigger.Label>Tanks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="grid_view" />
      </NativeTabs.Trigger>
      {/* Scan opens the camera over everything instead of becoming a tab of its own. */}
      <NativeTabs.Trigger
        name="scan-tab"
        disabled
        accessibilityLabel="Scan a tank QR code"
        listeners={{ tabPress: () => router.push('/scan') }}>
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="qrcode.viewfinder" md="qr_code_scanner" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fish">
        <NativeTabs.Trigger.Label>Fish</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'fish', selected: 'fish.fill' }} md="set_meal" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="breeding">
        <NativeTabs.Trigger.Label>Breeding</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
