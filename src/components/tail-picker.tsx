import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Muted } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TAIL_OPTIONS, type TailStandard } from '@/lib/constants';

// The drawing of each tail standard from the International High-Breeding Standard (IHS) 2023,
// so a beginner can match their fish by eye.
const TAILS: Record<Exclude<TailStandard, 'U'>, { image: number; tip: string }> = {
  A1: { image: require('@/assets/images/tails/a1.jpg'), tip: 'Long, narrow triangle that opens at about 45°.' },
  A2: { image: require('@/assets/images/tails/a2.jpg'), tip: 'Wide triangle with a straight back edge.' },
  A3: { image: require('@/assets/images/tails/a3.jpg'), tip: 'Curved top and bottom edges, with a dipped-in back edge.' },
  A4: { image: require('@/assets/images/tails/a4.jpg'), tip: 'Long rectangle, like a flag. Barely widens.' },
  A5: { image: require('@/assets/images/tails/a5.jpg'), tip: 'Spreads to a full half circle, very wide.' },
  B1: { image: require('@/assets/images/tails/b1.jpg'), tip: 'Small tail with a sword on the top and the bottom.' },
  B2: { image: require('@/assets/images/tails/b2.jpg'), tip: 'Small oval tail with one sword along the top.' },
  B3: { image: require('@/assets/images/tails/b3.jpg'), tip: 'Small oval tail with one sword along the bottom.' },
  B4: { image: require('@/assets/images/tails/b4.jpg'), tip: 'Two curved swords, top and bottom, like a lyre.' },
  C1: { image: require('@/assets/images/tails/c1.jpg'), tip: 'Short tail with parallel edges and a short point, like a spade.' },
  C2: { image: require('@/assets/images/tails/c2.jpg'), tip: 'Longer tail that tapers to a spear point.' },
  C3: { image: require('@/assets/images/tails/c3.jpg'), tip: 'Small, round tail, like a disc.' },
  C4: { image: require('@/assets/images/tails/c4.jpg'), tip: 'Round tail with a thin pin sticking out the middle.' },
};

// The tail standard field: a grid of tail drawings, plus "Not sure yet". Tapping one picks it.
export function TailPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TailStandard | null;
  onChange: (tail: TailStandard) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.grid}>
        {TAIL_OPTIONS.map((t) => {
          const selected = t.value === value;
          const tail = t.value === 'U' ? null : TAILS[t.value];
          return (
            <Pressable
              key={t.value}
              accessibilityRole="button"
              accessibilityLabel={tail ? `${t.label}. ${tail.tip}` : t.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(t.value)}
              style={({ pressed }) => [
                styles.cell,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: selected ? theme.accent : theme.border,
                  borderWidth: selected ? 2 : 1,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              {/* The drawings are black lines on white, so they keep a white card in dark mode too. */}
              <View style={styles.picture}>
                {tail ? (
                  <Image source={tail.image} style={styles.image} contentFit="contain" accessible={false} />
                ) : (
                  <Text style={styles.unknown}>?</Text>
                )}
              </View>
              <Text style={[styles.name, { color: theme.text }]}>{t.label}</Text>
              <Text style={[styles.tip, { color: theme.textSecondary }]}>
                {tail ? tail.tip : 'Pick this for now and choose the tail later.'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Muted>Drawings from the International High-Breeding Standard (IHS) 2023.</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cell: { width: '48%', borderWidth: 1, borderRadius: 10, padding: Spacing.two, gap: 2, alignItems: 'center' },
  picture: {
    width: '100%',
    height: 72,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unknown: { fontSize: 40, fontWeight: '700', color: '#888888' },
  image: { width: '100%', height: '100%' },
  name: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  tip: { fontSize: 11, textAlign: 'center' },
});
