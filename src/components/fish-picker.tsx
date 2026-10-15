import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Empty, Field } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { labelOf, SEXES } from '@/lib/constants';
import type { Fish } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

export function fishLabel(f: Fish): string {
  return [f.fish_code, f.name, f.strain].filter(Boolean).join(' · ');
}

// A searchable list of fish with tap-to-select. Used for moving fish and choosing parents.
export function FishPicker({
  fish,
  selected,
  onToggle,
  tankNames,
  emptyText,
}: {
  fish: Fish[];
  selected: string[];
  onToggle: (id: string) => void;
  tankNames?: Record<string, string>;
  emptyText: string;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fish;
    return fish.filter((f) =>
      [f.fish_code, f.name, f.strain, ...f.previous_codes].some((s) => s?.toLowerCase().includes(q)),
    );
  }, [fish, query]);

  return (
    <View style={styles.wrap}>
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="ID, name or strain" autoCapitalize="none" />
      {shown.length === 0 ? <Empty>{emptyText}</Empty> : null}
      {shown.map((f) => {
        const isSelected = selected.includes(f.id);
        return (
          <Pressable
            key={f.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onToggle(f.id)}
            style={[
              styles.row,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: isSelected ? theme.accent : 'transparent',
              },
            ]}>
            <View
              style={[
                styles.check,
                { borderColor: isSelected ? theme.accent : theme.border, backgroundColor: isSelected ? theme.accent : 'transparent' },
              ]}>
              {isSelected ? <Text style={{ color: theme.onAccent, fontWeight: '700' }}>✓</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>{f.fish_code}</Text>
              <Text style={{ color: theme.textSecondary }}>
                {[
                  f.name,
                  f.strain,
                  labelOf(SEXES, f.sex),
                  f.tank_id && tankNames ? tankNames[f.tank_id] : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 2,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '600' },
});
