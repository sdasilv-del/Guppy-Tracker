import { Platform, type StyleProp, StyleSheet, Text, TextInput, type TextStyle, View } from 'react-native';

import { ReasonSelect } from '@/components/reason-select';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IhsCategory } from '@/lib/constants';
import { parseNumber } from '@/lib/format';
import type { CategoryReasons } from '@/lib/ihs-reasons';

// The number pad has no return key on iPhone, so a bar above it carries Next.
export const SCORE_KEYBOARD = 'score-keyboard';

// One score on the male sheet: the points box, the standard's guide lines,
// the reasons points were lost and a free note.
export function ScoreRow({
  category,
  value,
  note,
  onValue,
  onNote,
  reasonOptions,
  reasons,
  onReasons,
  guide,
  inputRef,
  onNext,
  onFocus,
}: {
  inputRef?: (input: TextInput | null) => void;
  onNext?: () => void;
  onFocus?: () => void;
  category: IhsCategory;
  value: string;
  note: string;
  onValue: (text: string) => void;
  onNote: (text: string) => void;
  reasonOptions?: CategoryReasons;
  reasons: string[];
  onReasons: (next: string[]) => void;
  guide: string[];
}) {
  const theme = useTheme();
  const n = parseNumber(value);
  const bad = value.trim() !== '' && (n === null || n < 0 || n > category.max);
  const inputStyle = [styles.input, { color: theme.text, borderColor: bad ? theme.danger : theme.border }];
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreLine}>
        <Text style={[styles.scoreLabel, { color: theme.text }]}>{category.label}</Text>
        <TextInput
          value={value}
          onChangeText={onValue}
          keyboardType="decimal-pad"
          ref={inputRef}
          onFocus={onFocus}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={onNext}
          inputAccessoryViewID={Platform.OS === 'ios' ? SCORE_KEYBOARD : undefined}
          placeholder="–"
          placeholderTextColor={theme.textSecondary}
          style={[inputStyle, styles.scoreInput]}
          accessibilityLabel={`${category.part} ${category.label}, out of ${category.max}`}
        />
        <Text style={[styles.max, { color: theme.textSecondary }]}>/ {category.max}</Text>
      </View>
      {bad ? (
        <Text accessibilityLiveRegion="polite" style={[styles.guide, { color: theme.danger }]}>
          Enter a number from 0 to {category.max}.
        </Text>
      ) : null}
      {guide.map((line) => (
        <Text key={line} style={[styles.guide, { color: theme.textSecondary }]}>
          {line}
        </Text>
      ))}
      <ScoreReasons
        category={category}
        reasonOptions={reasonOptions}
        reasons={reasons}
        onReasons={onReasons}
        note={note}
        onNote={onNote}
        inputStyle={inputStyle}
      />
    </View>
  );
}

// The reasons list (when the standard has one) and the note under a score.
function ScoreReasons({
  category,
  reasonOptions,
  reasons,
  onReasons,
  note,
  onNote,
  inputStyle,
}: {
  category: IhsCategory;
  reasonOptions?: CategoryReasons;
  reasons: string[];
  onReasons: (next: string[]) => void;
  note: string;
  onNote: (text: string) => void;
  inputStyle: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <>
      {reasonOptions ? (
        <ReasonSelect
          title={`${category.part}: ${category.label}`}
          options={reasonOptions}
          selected={reasons}
          onChange={onReasons}
        />
      ) : null}
      <TextInput
        value={note}
        onChangeText={onNote}
        placeholder={reasonOptions ? 'Other / additional comment (optional)' : 'Note, e.g. why points were lost'}
        placeholderTextColor={theme.textSecondary}
        style={[inputStyle, styles.noteInput]}
        accessibilityLabel={`${category.part} ${category.label} note`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scoreRow: { gap: Spacing.one, paddingVertical: Spacing.one },
  guide: { fontSize: 12, lineHeight: 16 },
  scoreLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  scoreLabel: { flex: 1, fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15 },
  scoreInput: { width: 64, textAlign: 'center', fontSize: 17 },
  noteInput: { fontSize: 14 },
  max: { width: 36, fontSize: 15 },
});
