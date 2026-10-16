import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, DateField, ErrorText, Field, Loading, NumberField, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { deleteWaterTest, getWaterTest, saveWaterTest } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { blankToNull, fromDisplayTemp, numberText, parseNumber, todayISO, toDisplayTemp } from '@/lib/format';
import { attempt } from '@/lib/alerts';

const READINGS = [
  { key: 'temperature_c', label: 'Temperature' },
  { key: 'ph', label: 'pH' },
  { key: 'ammonia', label: 'Ammonia (ppm)' },
  { key: 'nitrite', label: 'Nitrite (ppm)' },
  { key: 'nitrate', label: 'Nitrate (ppm)' },
  { key: 'gh', label: 'GH (dGH)' },
  { key: 'kh', label: 'KH (dKH)' },
] as const;

type ReadingKey = (typeof READINGS)[number]['key'];

export default function WaterTestScreen() {
  const { id, testId } = useLocalSearchParams<{ id: string; testId?: string }>();
  const unit = useAuth().profile?.temperature_unit ?? 'C';
  const labelFor = (r: (typeof READINGS)[number]) => (r.key === 'temperature_c' ? `Temperature (°${unit})` : r.label);
  const [loading, setLoading] = useState(!!testId);
  const [date, setDate] = useState<string | null>(todayISO());
  const [values, setValues] = useState<Record<ReadingKey, string>>({
    temperature_c: '',
    ph: '',
    ammonia: '',
    nitrite: '',
    nitrate: '',
    gh: '',
    kh: '',
  });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) return;
    getWaterTest(testId).then((t) => {
      if (t) {
        setDate(t.tested_on);
        setValues({
          temperature_c: t.temperature_c === null ? '' : numberText(toDisplayTemp(t.temperature_c, unit)),
          ph: numberText(t.ph),
          ammonia: numberText(t.ammonia),
          nitrite: numberText(t.nitrite),
          nitrate: numberText(t.nitrate),
          gh: numberText(t.gh),
          kh: numberText(t.kh),
        });
        setNotes(t.notes ?? '');
      }
      setLoading(false);
    })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [testId, unit]);

  if (loading) return <Loading />;

  async function save() {
    for (const r of READINGS) {
      if (values[r.key].trim() !== '' && parseNumber(values[r.key]) === null) {
        setError(`${labelFor(r)} must be a number.`);
        return;
      }
    }
    const temp = parseNumber(values.temperature_c);
    setBusy(true);
    setError(null);
    try {
      await saveWaterTest(testId ?? null, {
        tank_id: id,
        tested_on: date ?? todayISO(),
        temperature_c: temp === null ? null : fromDisplayTemp(temp, unit),
        ph: parseNumber(values.ph),
        ammonia: parseNumber(values.ammonia),
        nitrite: parseNumber(values.nitrite),
        nitrate: parseNumber(values.nitrate),
        gh: parseNumber(values.gh),
        kh: parseNumber(values.kh),
        notes: blankToNull(notes),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this water test?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => attempt(() => deleteWaterTest(testId!), () => router.back()),
      },
    ]);
  }

  return (
    <Screen>
      <DateField label="Date" value={date} onChange={setDate} />
      <View style={styles.grid}>
        {READINGS.map((r) => (
          <View key={r.key} style={styles.cell}>
            <NumberField
              label={labelFor(r)}
              value={values[r.key]}
              onChangeText={(t) => setValues({ ...values, [r.key]: t })}
            />
          </View>
        ))}
      </View>
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={error} />
      <Button title={testId ? 'Save changes' : 'Save test'} onPress={save} busy={busy} />
      {testId ? <Button title="Delete test" variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  cell: { width: '47%' },
});
