import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ReasonSelect } from '@/components/reason-select';
import { Card, Heading } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { parseNumber } from '@/lib/format';
import { FEMALE_SHEET, type FemaleCategory } from '@/lib/ihs-female';
import { useTheme } from '@/hooks/use-theme';

export type FemaleSheetState = {
  scores: Record<string, string>;
  reasons: Record<string, string[]>;
  notes: Record<string, string>;
};

// Scored criteria, the total, and what is still unanswered. Blank means unanswered; 0 is a real score.
export function femaleTotals(scores: Record<string, string>) {
  const missing = FEMALE_SHEET.filter((c) => (scores[c.key] ?? '').trim() === '');
  const total = FEMALE_SHEET.reduce((sum, c) => sum + (parseNumber(scores[c.key] ?? '') ?? 0), 0);
  return { total: Math.round(total * 10) / 10, missing };
}

function CommentField({ value, onChange, label }: { value: string; onChange: (text: string) => void; label: string }) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="Other / additional comment (optional)"
      placeholderTextColor={theme.textSecondary}
      multiline
      style={[styles.comment, { color: theme.text, borderColor: theme.border }]}
      accessibilityLabel={`${label} comment`}
    />
  );
}

function Criterion({
  category,
  state,
  onChange,
}: {
  category: FemaleCategory;
  state: FemaleSheetState;
  onChange: (next: Partial<FemaleSheetState>) => void;
}) {
  const theme = useTheme();
  const value = state.scores[category.key] ?? '';
  const n = parseNumber(value);
  const bad = value.trim() !== '' && (n === null || n < 0 || n > category.max);
  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.label}>
          <Heading>{category.label}</Heading>
        </View>
        <TextInput
          value={value}
          onChangeText={(text) => onChange({ scores: { ...state.scores, [category.key]: text } })}
          keyboardType="decimal-pad"
          placeholder="–"
          placeholderTextColor={theme.textSecondary}
          style={[styles.scoreInput, { color: theme.text, borderColor: bad ? theme.danger : theme.border }]}
          accessibilityLabel={`${category.label}, out of ${category.max}`}
        />
        <Text style={[styles.max, { color: theme.textSecondary }]}>/ {category.max}</Text>
      </View>
      <Text style={[styles.guide, { color: theme.textSecondary }]}>{category.guide}</Text>
      {category.note ? <Text style={[styles.guide, { color: theme.textSecondary }]}>{category.note}</Text> : null}
      <Text style={[styles.guide, { color: theme.textSecondary }]}>
        {category.scale.map((o) => o.label).join(' · ')}
      </Text>
      <ReasonSelect
        title={category.label}
        options={category.reasons}
        selected={state.reasons[category.key] ?? []}
        onChange={(next) => onChange({ reasons: { ...state.reasons, [category.key]: next } })}
      />
      <CommentField
        label={category.label}
        value={state.notes[category.key] ?? ''}
        onChange={(text) => onChange({ notes: { ...state.notes, [category.key]: text } })}
      />
    </Card>
  );
}

export function FemaleScoreSheet({
  state,
  onChange,
}: {
  state: FemaleSheetState;
  onChange: (next: Partial<FemaleSheetState>) => void;
}) {
  return (
    <>
      {FEMALE_SHEET.map((category) => (
        <Criterion key={category.key} category={category} state={state} onChange={onChange} />
      ))}

    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { flex: 1 },
  guide: { fontSize: 13, lineHeight: 18 },
  scoreInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 64, textAlign: 'center', fontSize: 17 },
  max: { width: 36, fontSize: 15 },
  comment: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, minHeight: 44 },
});
