import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FishPicker } from '@/components/fish-picker';
import { ReasonSelect } from '@/components/reason-select';
import { Body, Button, Card, ChipSelect, Heading, InfoRow, Muted, NumberField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { BASE_COLOURS, COVER_COLOURS, labelOf, TAIL_STANDARDS } from '@/lib/constants';
import { parseNumber } from '@/lib/format';
import {
  DISQUALIFY_KEY,
  DISQUALIFY_OTHER,
  FEMALE_DISQUALIFY,
  FEMALE_SHEET,
  type FemaleCategory,
  sizeRatio,
} from '@/lib/ihs-female';
import type { Fish } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

export type FemaleSheetState = {
  scores: Record<string, string>;
  reasons: Record<string, string[]>;
  notes: Record<string, string>;
  maleId: string | null;
  femaleMm: string;
  maleMm: string;
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
  locked,
  children,
}: {
  category: FemaleCategory;
  state: FemaleSheetState;
  onChange: (next: Partial<FemaleSheetState>) => void;
  locked?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const raw = state.scores[category.key] ?? '';
  const value = raw.trim() === '' ? null : parseNumber(raw);
  // An older evaluation may hold a score that isn't on the scale, e.g. 2.5; keep it selectable.
  const options = category.scale.map((o) => ({ value: o.points, label: o.label }));
  if (value !== null && !options.some((o) => o.value === value)) {
    options.push({ value, label: `${value} (earlier score)` });
  }
  return (
    <Card>
      <View style={styles.header}>
        <Heading>{category.label}</Heading>
        <Muted>{value === null ? `– / ${category.max}` : `${value} / ${category.max}`}</Muted>
      </View>
      <Text style={[styles.guide, { color: theme.textSecondary }]}>{category.guide}</Text>
      {category.note ? <Text style={[styles.guide, { color: theme.textSecondary }]}>{category.note}</Text> : null}
      {children}
      {locked ? <Body style={[styles.warning, { color: theme.danger }]}>{locked}</Body> : null}
      <ChipSelect<number>
        label="Score"
        options={options}
        value={value}
        onChange={(v) => onChange({ scores: { ...state.scores, [category.key]: v === null ? '' : String(v) } })}
        allowClear
      />
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
  males,
}: {
  state: FemaleSheetState;
  onChange: (next: Partial<FemaleSheetState>) => void;
  males: Fish[];
}) {
  const theme = useTheme();
  const [choosing, setChoosing] = useState(false);
  const male = males.find((m) => m.id === state.maleId) ?? null;
  const ratio = sizeRatio(parseNumber(state.femaleMm), parseNumber(state.maleMm));
  const dq = state.reasons[DISQUALIFY_KEY] ?? [];
  const [size, form, matching, vitality] = FEMALE_SHEET;

  return (
    <>
      <Card>
        <View style={styles.header}>
          <Heading>Male for comparison</Heading>
          <Button title={choosing ? 'Close' : male ? 'Change' : 'Choose'} variant="secondary" small onPress={() => setChoosing(!choosing)} />
        </View>
        {male ? (
          <>
            <InfoRow label="Male" value={male.fish_code} />
            <InfoRow label="Strain" value={male.strain} />
            <InfoRow label="Tail standard" value={labelOf(TAIL_STANDARDS, male.tail_standard)} />
            <InfoRow label="Base colour" value={labelOf(BASE_COLOURS, male.base_colour)} />
            <InfoRow label="Cover colour" value={male.cover_colours.map((c) => labelOf(COVER_COLOURS, c)).join(', ')} />
            <Button title="Remove male" variant="secondary" small onPress={() => onChange({ maleId: null })} />
          </>
        ) : (
          <Body style={[styles.warning, { color: theme.danger }]}>Male comparison required</Body>
        )}
        {choosing ? (
          <FishPicker
            fish={males}
            selected={state.maleId ? [state.maleId] : []}
            onToggle={(fid) => {
              onChange({ maleId: fid === state.maleId ? null : fid });
              setChoosing(false);
            }}
            emptyText="No males in your fish list yet."
          />
        ) : null}
      </Card>

      <Criterion category={size} state={state} onChange={onChange}>
        <View style={styles.row}>
          <View style={styles.half}>
            <NumberField label="Female length (mm)" value={state.femaleMm} onChangeText={(t) => onChange({ femaleMm: t })} />
          </View>
          <View style={styles.half}>
            <NumberField label="Male length (mm)" value={state.maleMm} onChangeText={(t) => onChange({ maleMm: t })} />
          </View>
        </View>
        {ratio !== null ? (
          <Muted>
            Female-to-male ratio {ratio.toFixed(2)} : 1 (ideal 1.50 : 1, that is 3:2). This is a guide; you choose the score.
          </Muted>
        ) : null}
      </Criterion>
      <Criterion category={form} state={state} onChange={onChange} />
      <Criterion
        category={matching}
        state={state}
        onChange={onChange}
        locked={male ? undefined : 'Male comparison required. Leave Matching unscored until you can compare with the male.'}
      />
      <Criterion category={vitality} state={state} onChange={onChange} />

      <Card style={dq.length > 0 ? { borderWidth: 1, borderColor: theme.danger } : undefined}>
        <Heading>Disqualify entry</Heading>
        <Muted>Applies to the pair. Ordinary form or matching reasons never disqualify on their own.</Muted>
        <ReasonSelect
          title="Disqualify entry"
          placeholder="Choose a disqualification reason"
          options={FEMALE_DISQUALIFY}
          selected={dq}
          onChange={(next) => onChange({ reasons: { ...state.reasons, [DISQUALIFY_KEY]: next } })}
        />
        {dq.includes(DISQUALIFY_OTHER) ? (
          <TextInput
            value={state.notes[DISQUALIFY_KEY] ?? ''}
            onChangeText={(text) => onChange({ notes: { ...state.notes, [DISQUALIFY_KEY]: text } })}
            placeholder="Explain the disqualification (required)"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.comment, { color: theme.text, borderColor: theme.danger }]}
            accessibilityLabel="Disqualification explanation"
          />
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  guide: { fontSize: 13, lineHeight: 18 },
  warning: { fontWeight: '600' },
  comment: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, minHeight: 44 },
  row: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});
