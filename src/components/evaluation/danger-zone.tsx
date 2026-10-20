import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Muted } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Destructive actions at the very bottom of a screen, set apart by a thin line.
// A shared DangerZone is being added to ui.tsx; swap this for it when that lands.
export function DangerZone({ note, children }: { note: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.zone, { borderTopColor: theme.divider }]}>
      <Muted>{note}</Muted>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
