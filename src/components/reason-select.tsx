import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { type CategoryReasons, toggleReason } from '@/lib/ihs-reasons';
import { useTheme } from '@/hooks/use-theme';

// A "Reason for score" dropdown: opens a list to pick from, and shows each choice as a removable chip.
export function ReasonSelect({
  categoryKey,
  title,
  options,
  selected,
  onChange,
}: {
  categoryKey: string;
  title: string;
  options: CategoryReasons;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const chosen = selected
    .map((id) => options.reasons.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reason for score, ${title}`}
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor: theme.border }]}>
        <Text style={{ color: theme.textSecondary, fontSize: 14, flex: 1 }}>
          {chosen.length === 0
            ? 'Reason for score'
            : options.single
              ? 'Change reason'
              : 'Add or change reasons'}
        </Text>
        <Text style={{ color: theme.textSecondary }}>▾</Text>
      </Pressable>

      {chosen.length > 0 ? (
        <View style={styles.chips}>
          {chosen.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${r.label}`}
              onPress={() => onChange(selected.filter((id) => id !== r.id))}
              style={[
                styles.chip,
                {
                  backgroundColor: r.disqualifies ? theme.danger : theme.backgroundSelected,
                },
              ]}>
              <Text style={[styles.chipText, { color: r.disqualifies ? theme.onAccent : theme.text }]}>
                {r.label}
              </Text>
              <Text style={[styles.chipX, { color: r.disqualifies ? theme.onAccent : theme.textSecondary }]}>✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: theme.background }]}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
          <Text style={{ color: theme.textSecondary }}>
            {options.single ? 'Choose one.' : 'Choose every reason that applies.'}
          </Text>
          <ScrollView contentContainerStyle={styles.list}>
            {options.reasons.map((r) => {
              const isSelected = selected.includes(r.id);
              return (
                <Pressable
                  key={r.id}
                  accessibilityRole={options.single ? 'radio' : 'checkbox'}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => {
                    const next = toggleReason(categoryKey, selected, r.id);
                    onChange(next);
                    if (options.single && next.length > 0) setOpen(false);
                  }}
                  style={[
                    styles.option,
                    { backgroundColor: theme.backgroundElement, borderColor: isSelected ? theme.accent : 'transparent' },
                  ]}>
                  <View
                    style={[
                      options.single ? styles.radio : styles.check,
                      {
                        borderColor: isSelected ? theme.accent : theme.border,
                        backgroundColor: isSelected ? theme.accent : 'transparent',
                      },
                    ]}>
                    {isSelected ? <Text style={{ color: theme.onAccent, fontWeight: '700' }}>✓</Text> : null}
                  </View>
                  <Text style={[styles.optionText, { color: r.disqualifies ? theme.danger : theme.text }]}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button title="Done" onPress={() => setOpen(false)} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  chipText: { fontSize: 13, flexShrink: 1 },
  chipX: { fontSize: 12, fontWeight: '700' },
  sheet: { flex: 1, padding: Spacing.three, gap: Spacing.two },
  sheetTitle: { fontSize: 20, fontWeight: '700' },
  list: { gap: Spacing.two, paddingVertical: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionText: { flex: 1, fontSize: 15 },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
