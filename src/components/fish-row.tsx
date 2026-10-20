import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LineGuppy } from '@/components/line-icons';
import { Icon } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Display, Spacing } from '@/constants/theme';
import { FISH_STATUSES, labelOf, SEXES } from '@/lib/constants';
import { formatAge } from '@/lib/format';
import { type ScoreSummary, scoreLabel } from '@/lib/scores';
import type { Fish } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

// One fish in the Fish tab: photo or line-drawn guppy, its code in the serif, and its best score
// as a small champagne numeral on the right. Rows are split by hairlines rather than boxed.
export function FishRow({
  fish: f,
  thumb,
  tankName,
  best,
  selecting,
  selected,
  onPress,
  onLongPress,
}: {
  fish: Fish;
  thumb?: string;
  tankName?: string | null;
  best?: ScoreSummary | null;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const about = [f.name, f.strain, labelOf(SEXES, f.sex), formatAge(f.date_of_birth)].filter(Boolean).join(' · ');
  const where = [labelOf(FISH_STATUSES, f.status), tankName].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={[f.fish_code, about, where, best ? `best IHS ${scoreLabel(best)}` : null]
        .filter(Boolean)
        .join(', ')}
      accessibilityState={selecting ? { selected } : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.divider,
          borderLeftColor: selecting && selected ? theme.accent : 'transparent',
          backgroundColor: selecting && selected ? theme.backgroundSelected : pressed ? theme.backgroundElement : 'transparent',
        },
      ]}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={[styles.thumb, { borderColor: theme.divider }]} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.noThumb, { borderColor: theme.divider }]}>
          <LineGuppy tail={f.tail_standard} size={44} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={[styles.code, { color: theme.text }]} numberOfLines={1}>
          {f.fish_code}
        </Text>
        {about ? (
          <Text style={[styles.detail, { color: theme.textSecondary }]} numberOfLines={1}>
            {about}
          </Text>
        ) : null}
        <Text style={[styles.detail, { color: theme.textSecondary }]} numberOfLines={1}>
          {where}
        </Text>
      </View>
      {best ? <Text style={[styles.score, { color: theme.highlight }]}>{best.total}</Text> : null}
      {selecting ? (
        <Icon
          name={selected ? Icons.done : Icons.circle}
          size={24}
          color={selected ? theme.accent : theme.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 2,
  },
  thumb: { width: 60, height: 60, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  noThumb: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  code: { fontFamily: Display.semibold, fontSize: 22, lineHeight: 26, fontVariant: ['lining-nums', 'tabular-nums'] },
  detail: { fontSize: 13, lineHeight: 18 },
  score: { fontFamily: Display.medium, fontSize: 24, lineHeight: 28, fontVariant: ['lining-nums', 'tabular-nums'] },
});
