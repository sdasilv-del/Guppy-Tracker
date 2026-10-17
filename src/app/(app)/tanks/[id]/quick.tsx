import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Body, Button, ChipSelect, ErrorText, Heading, LoadError, Loading, Muted } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getTank, listWaterChanges, saveWaterChange } from '@/lib/db';
import { formatDate, fromISODate, todayISO } from '@/lib/format';
import { useFocusData } from '@/lib/use-data';

const PERCENTS = [10, 20, 25, 30, 50].map((p) => ({ value: p, label: `${p}%` }));

function daysAgo(iso: string): string {
  const days = Math.round((fromISODate(todayISO()).getTime() - fromISODate(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

// The sheet that opens after scanning a tank label: log a water change in one tap, or jump on.
export default function QuickLogSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data, error, reload } = useFocusData(async () => {
    const [tank, changes] = await Promise.all([getTank(id), listWaterChanges(id)]);
    return { tank, last: changes[0] ?? null };
  });
  const [percent, setPercent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!data && !error) return <Loading />;

  // Starts on the amount used last time, since most tanks get the same change every time.
  const chosen = percent ?? data?.last?.percent ?? 25;
  const tank = data?.tank;

  async function logChange() {
    setBusy(true);
    setSaveError(null);
    try {
      await saveWaterChange(null, { tank_id: id, changed_on: todayISO(), percent: chosen, notes: null });
      setSaved(chosen);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.sheet, { backgroundColor: theme.background }]}>
      {error ? <LoadError message={`Couldn't load this tank. ${error}`} onRetry={reload} /> : null}
      <View style={styles.header}>
        <Heading>{tank ? (tank.name ? `${tank.tank_code} · ${tank.name}` : tank.tank_code) : 'Tank'}</Heading>
        <Muted>
          {data?.last
            ? `Last water change ${daysAgo(data.last.changed_on)}${
                data.last.percent != null ? ` (${data.last.percent}%)` : ''
              }, ${formatDate(data.last.changed_on)}`
            : 'No water changes logged yet'}
        </Muted>
      </View>

      {saved != null ? (
        <View style={styles.header}>
          <Body>✓ Saved a {saved}% water change for today.</Body>
          <Button title="Done" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={styles.header}>
          <ChipSelect label="Water changed" options={PERCENTS} value={chosen} onChange={(v) => v && setPercent(v)} />
          <ErrorText message={saveError} />
          <Button title={`Log ${chosen}% water change today`} onPress={logChange} busy={busy} />
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.cell}>
          <Button
            title="Fed"
            icon={Icons.feeding}
            small
            variant="secondary"
            onPress={() => router.replace({ pathname: '/tanks/[id]/care', params: { id, kind: 'feeding' } })}
          />
        </View>
        <View style={styles.cell}>
          <Button
            title="Treatment"
            icon={Icons.treatment}
            small
            variant="secondary"
            onPress={() => router.replace({ pathname: '/tanks/[id]/care', params: { id, kind: 'treatment' } })}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.cell}>
          <Button
            title="Water test"
            small
            variant="secondary"
            onPress={() => router.replace({ pathname: '/tanks/[id]/water-test', params: { id } })}
          />
        </View>
        <View style={styles.cell}>
          <Button
            title="Move fish here"
            small
            variant="secondary"
            onPress={() => router.replace({ pathname: '/tanks/[id]/add-fish', params: { id } })}
          />
        </View>
        <View style={styles.cell}>
          <Button
            title="Open tank"
            small
            variant="secondary"
            onPress={() => router.replace({ pathname: '/tanks/[id]', params: { id } })}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  header: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  cell: { flex: 1 },
});
