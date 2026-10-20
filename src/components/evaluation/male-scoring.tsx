import { StyleSheet, type TextInput, View } from 'react-native';

import { ScoreRow } from '@/components/evaluation/score-row';
import { Button, Card, ChipSelect, Heading, Muted } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { IhsCategory } from '@/lib/constants';
import type { CategoryReasons } from '@/lib/ihs-reasons';

// The male sheet, scored one body part at a time with Previous and Next,
// or every part at once. The screen owns the scores; this only lays them out.
export function MaleScoring({
  categories,
  parts,
  partIndex,
  allParts,
  onPart,
  onAllParts,
  pointsFor,
  scores,
  scoreNotes,
  scoreReasons,
  onScore,
  onNote,
  onReasons,
  reasonOptions,
  guideFor,
  inputs,
  onFocus,
  onNext,
}: {
  categories: IhsCategory[];
  parts: string[];
  partIndex: number;
  allParts: boolean;
  onPart: (index: number) => void;
  onAllParts: (all: boolean) => void;
  pointsFor: (list: IhsCategory[]) => number;
  scores: Record<string, string>;
  scoreNotes: Record<string, string>;
  scoreReasons: Record<string, string[]>;
  onScore: (key: string, text: string) => void;
  onNote: (key: string, text: string) => void;
  onReasons: (key: string, next: string[]) => void;
  reasonOptions: (key: string) => CategoryReasons | undefined;
  guideFor: (key: string) => string[];
  // Score boxes by category, so Next can move to the next one.
  inputs: Map<string, TextInput | null>;
  onFocus: (key: string) => void;
  onNext: (key: string) => void;
}) {
  const inPart = (part: string) => categories.filter((c) => c.part === part);
  return (
    <>
      <ChipSelect
        label="Body part"
        options={parts.map((part, i) => ({ value: i, label: `${part} ${pointsFor(inPart(part))}` }))}
        value={allParts ? null : partIndex}
        onChange={(v) => {
          if (v === null) return;
          onAllParts(false);
          onPart(v);
        }}
      />
      <Button
        title={allParts ? 'One part at a time' : 'Show all parts'}
        variant="secondary"
        small
        onPress={() => onAllParts(!allParts)}
      />

      {(allParts ? parts : [parts[partIndex]]).map((part) => (
        <Card key={part}>
          <View style={styles.partHeader}>
            <Heading>{part}</Heading>
            <Muted>
              {pointsFor(inPart(part))} / {inPart(part).reduce((sum, c) => sum + c.max, 0)}
            </Muted>
          </View>
          {inPart(part).map((c) => (
            <ScoreRow
              key={c.key}
              category={c}
              value={scores[c.key] ?? ''}
              note={scoreNotes[c.key] ?? ''}
              onValue={(text) => onScore(c.key, text)}
              onNote={(text) => onNote(c.key, text)}
              reasonOptions={reasonOptions(c.key)}
              reasons={scoreReasons[c.key] ?? []}
              onReasons={(next) => onReasons(c.key, next)}
              inputRef={(input) => {
                inputs.set(c.key, input);
              }}
              onFocus={() => onFocus(c.key)}
              onNext={() => onNext(c.key)}
              guide={guideFor(c.key)}
            />
          ))}
        </Card>
      ))}

      {allParts ? null : (
        <View style={styles.buttons}>
          <View style={styles.half}>
            <Button
              title="Previous part"
              variant="secondary"
              small
              disabled={partIndex === 0}
              onPress={() => onPart(partIndex - 1)}
            />
          </View>
          <View style={styles.half}>
            <Button
              title="Next part"
              small
              disabled={partIndex === parts.length - 1}
              onPress={() => onPart(partIndex + 1)}
            />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  partHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});
