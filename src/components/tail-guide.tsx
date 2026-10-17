import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TAIL_STANDARDS, type TailStandard } from '@/lib/constants';

// Simple outlines of the 13 IKGH tail standards, so a beginner can match their fish by eye.
// Each is the tail only, drawn behind the same body; they show the shape, not exact proportions.
const TAILS: Record<Exclude<TailStandard, 'U'>, { shapes: string[]; circle?: [number, number, number]; tip: string }> = {
  A1: { shapes: ['M60,30 L108,12 Q111,30 108,48 Z'], tip: 'Long, narrow triangle that opens at about 45°.' },
  A2: { shapes: ['M60,30 L100,4 L100,56 Z'], tip: 'Wide triangle with a straight back edge.' },
  A3: { shapes: ['M60,30 C75,22 90,12 102,9 Q92,30 102,51 C90,48 75,38 60,30 Z'], tip: 'Curved top and bottom edges, with a dipped-in back edge.' },
  A4: { shapes: ['M58,26 L108,18 L108,42 L58,34 Z'], tip: 'Long rectangle, like a flag. Barely widens.' },
  A5: { shapes: ['M60,30 L90,4 A26,26 0 0 1 90,56 Z'], tip: 'Spreads to a full half circle, very wide.' },
  B1: {
    shapes: ['M58,30 L70,23 Q74,30 70,37 Z', 'M68,25 L114,13 L70,28 Z', 'M68,35 L114,47 L70,32 Z'],
    tip: 'Small tail with a sword on the top and the bottom.',
  },
  B2: { shapes: ['M58,30 L70,23 Q74,30 70,37 Z', 'M68,26 L114,18 L70,29 Z'], tip: 'Small oval tail with one sword along the top.' },
  B3: { shapes: ['M58,30 L70,23 Q74,30 70,37 Z', 'M68,34 L114,42 L70,31 Z'], tip: 'Small oval tail with one sword along the bottom.' },
  B4: {
    shapes: ['M58,30 L70,24 Q73,30 70,36 Z', 'M66,26 Q92,4 114,12 Q90,12 70,29 Z', 'M66,34 Q92,56 114,48 Q90,48 70,31 Z'],
    tip: 'Two curved swords, top and bottom, like a lyre.',
  },
  C1: { shapes: ['M60,30 L66,22 L84,22 L96,30 L84,38 L66,38 Z'], tip: 'Short tail with parallel edges and a short point, like a spade.' },
  C2: { shapes: ['M60,30 L70,22 L108,30 L70,38 Z'], tip: 'Longer tail that tapers to a spear point.' },
  C3: { shapes: [], circle: [72, 30, 14], tip: 'Small, round tail, like a disc.' },
  C4: { shapes: ['M76,28 L114,30 L76,32 Z'], circle: [68, 30, 10], tip: 'Round tail with a thin pin sticking out the middle.' },
};

function TailPicture({ code, size = 96 }: { code: Exclude<TailStandard, 'U'>; size?: number }) {
  const theme = useTheme();
  const t = TAILS[code];
  return (
    <Svg width={size} height={size / 2} viewBox="0 0 120 60">
      {t.shapes.map((d, i) => (
        <Path key={i} d={d} fill={theme.accent} fillOpacity={0.75} />
      ))}
      {t.circle ? <Circle cx={t.circle[0]} cy={t.circle[1]} r={t.circle[2]} fill={theme.accent} fillOpacity={0.75} /> : null}
      <Ellipse cx={36} cy={30} rx={24} ry={9} fill={theme.textSecondary} />
    </Svg>
  );
}

// A grid of tail pictures. Tapping one picks it.
export function TailGuide({ value, onPick }: { value: TailStandard | null; onPick: (tail: TailStandard) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {TAIL_STANDARDS.map((t) => {
        const selected = t.value === value;
        return (
          <Pressable
            key={t.value}
            accessibilityRole="button"
            accessibilityLabel={`${t.label}. ${TAILS[t.value].tip}`}
            accessibilityState={{ selected }}
            onPress={() => onPick(t.value)}
            style={({ pressed }) => [
              styles.cell,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: selected ? theme.accent : theme.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <TailPicture code={t.value} />
            <Text style={[styles.name, { color: theme.text }]}>{t.label}</Text>
            <Text style={[styles.tip, { color: theme.textSecondary }]}>{TAILS[t.value].tip}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cell: { width: '48%', borderWidth: 1, borderRadius: 10, padding: Spacing.two, gap: 2, alignItems: 'center' },
  name: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  tip: { fontSize: 11, textAlign: 'center' },
});
