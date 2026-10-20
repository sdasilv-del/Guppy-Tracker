import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ErrorText, Heading, Muted } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteCustomReminder, getCustomReminder, saveCustomReminder, snoozeReminder } from '@/lib/db';
import { todayISO } from '@/lib/format';
import { addDays, dueLabel } from '@/lib/reminders';

const SNOOZES = [
  { days: 1, label: 'Tomorrow' },
  { days: 3, label: 'In 3 days' },
  { days: 7, label: 'In a week' },
];

// The sheet behind a reminder's clock button on Home: snooze it, or mark your own reminders done.
export default function ReminderActionsSheet() {
  const { key, title, due, customId } = useLocalSearchParams<{
    key: string;
    title: string;
    due: string;
    customId?: string;
  }>();
  const theme = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();

  async function run(label: string, work: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await work();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  // A repeating reminder moves on from today; a one-off is finished and goes away.
  async function markDone() {
    const r = await getCustomReminder(customId!);
    if (!r) return;
    if (r.repeat_every_days) {
      const { id: _, created_at: __, ...input } = r;
      await saveCustomReminder(r.id, { ...input, due_on: addDays(today, r.repeat_every_days) });
    } else {
      await deleteCustomReminder(r.id);
    }
  }

  return (
    <View style={[styles.sheet, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Heading>{title}</Heading>
        {due ? <Muted>{dueLabel(due, today)}</Muted> : null}
      </View>
      {customId ? <Button title="Mark done" busy={busy === 'done'} onPress={() => run('done', markDone)} /> : null}
      <Muted>Snooze until</Muted>
      <View style={styles.row}>
        {SNOOZES.map((s) => (
          <View key={s.days} style={styles.cell}>
            <Button
              title={s.label}
              small
              variant="secondary"
              busy={busy === s.label}
              onPress={() => run(s.label, () => snoozeReminder(key, addDays(today, s.days)))}
            />
          </View>
        ))}
      </View>
      {customId ? (
        <Button
          title="Edit reminder"
          variant="secondary"
          onPress={() => router.replace({ pathname: '/reminders/edit', params: { reminderId: customId } })}
        />
      ) : null}
      <ErrorText message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  header: { gap: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two },
  cell: { flex: 1 },
});
