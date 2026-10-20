import { InputAccessoryView, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCORE_KEYBOARD } from '@/components/evaluation/score-row';
import { Body, Button, Card, Muted } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The total under the sheet. A disqualified entry shows its total struck through,
// and an unfinished female sheet lists what's still missing.
export function TotalCard({
  total,
  max,
  disqualified: dq,
  dqText,
  missing,
}: {
  total: number;
  max: number;
  disqualified: boolean;
  dqText: string;
  missing: string[];
}) {
  const theme = useTheme();
  return (
    <Card style={styles.totalCard}>
      {dq ? <Body style={[styles.total, { color: theme.danger }]}>Disqualified</Body> : null}
      <Body style={dq ? styles.voidTotal : styles.total}>
        {total} / {max}
      </Body>
      <Muted>{dq ? 'Not a valid final result, because the entry is disqualified' : 'Total, added up from the scores above'}</Muted>
      {dq ? <Body style={[styles.bold, { color: theme.danger }]}>{dqText}</Body> : null}
      {missing.length > 0 ? <Body style={styles.bold}>Incomplete: {missing.join(', ')} not scored yet</Body> : null}
    </Card>
  );
}

// Room at the end of the page so the pinned total never covers the last button.
export function PinnedTotalSpace() {
  return <View style={styles.barSpace} />;
}

// The running total pinned to the bottom of the screen while a male is scored,
// clear of the home indicator.
export function PinnedTotal({ total, max, disqualified, detail }: { total: number; max: number; disqualified: boolean; detail: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.totalBar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.divider,
          paddingBottom: insets.bottom + Spacing.two,
        },
      ]}>
      <Text style={[styles.barTotal, { color: disqualified ? theme.danger : theme.text }]}>
        {disqualified ? 'Disqualified' : `${total} / ${max}`}
      </Text>
      <Muted>{detail}</Muted>
    </View>
  );
}

// The bar above the iPhone number pad that carries Next. Nothing on other platforms.
export function ScoreKeyboardBar({ onNext }: { onNext: () => void }) {
  const theme = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={SCORE_KEYBOARD}>
      <View style={[styles.accessory, { backgroundColor: theme.backgroundElement, borderTopColor: theme.divider }]}>
        <Button title="Next" small onPress={onNext} />
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  totalCard: { alignItems: 'center', gap: 2 },
  total: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  voidTotal: { fontSize: 20, lineHeight: 26, textDecorationLine: 'line-through' },
  bold: { fontWeight: '700' },
  barSpace: { height: 96 },
  totalBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barTotal: { fontSize: 22, fontWeight: '700' },
  accessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
