import { StyleSheet, Text } from 'react-native';

import { Body, Card, InfoRow, Muted } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { BASE_COLOURS, COVER_COLOURS, labelOf, TAIL_STANDARDS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import type { Evaluation, Fish } from '@/lib/types';

// The female sheet's printed title, as on the club form.
export function FemaleSheetTitle() {
  const theme = useTheme();
  return <Text style={[styles.sheetTitle, { color: theme.text }]}>Female Guppy Evaluation</Text>;
}

// The fish and the class it's judged in. The class comes from the score once saved.
export function ClassCard({
  fishCode,
  klass,
  standardYear,
}: {
  fishCode: string;
  klass: Pick<Fish, 'base_colour' | 'cover_colours'> & { tail_standard: string | null };
  standardYear: number;
}) {
  return (
    <Card>
      <InfoRow label="Fish" value={fishCode} />
      <InfoRow label="Class" value={labelOf(TAIL_STANDARDS, klass.tail_standard as Fish['tail_standard'])} />
      <InfoRow label="Base colour" value={labelOf(BASE_COLOURS, klass.base_colour)} />
      <InfoRow label="Cover colour" value={klass.cover_colours.map((c) => labelOf(COVER_COLOURS, c)).join(', ')} />
      <InfoRow label="Standard" value={`IHS ${standardYear}`} />
    </Card>
  );
}

// Shown above a locked score: who signed it and its seal.
export function LockedNotice({ evaluation }: { evaluation: Evaluation }) {
  const theme = useTheme();
  return (
    <Card style={{ borderWidth: 1, borderColor: theme.accent }}>
      <Body style={styles.bold}>Locked and signed by {evaluation.judge}</Body>
      <Muted>
        {`Signed ${formatDate(evaluation.locked_at!.slice(0, 10))} · seal ${evaluation.seal}. This score can't be changed or deleted.`}
      </Muted>
    </Card>
  );
}

// A disqualifying reason was picked on the male sheet.
export function DisqualifiedNotice({ dqText }: { dqText: string }) {
  const theme = useTheme();
  return (
    <Card style={{ borderWidth: 1, borderColor: theme.danger }}>
      <Body style={[styles.bold, { color: theme.danger }]}>Disqualified: {dqText}</Body>
      <Muted>Remove the reason under Body form if this was chosen by mistake.</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  sheetTitle: { fontSize: 24, fontWeight: '800' },
});
