import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, DateField, ErrorText, Field, Loading, NumberField, Screen } from '@/components/ui';
import { deleteWaterChange, getWaterChange, saveWaterChange } from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';

export default function WaterChangeScreen() {
  const { id, changeId } = useLocalSearchParams<{ id: string; changeId?: string }>();
  const [loading, setLoading] = useState(!!changeId);
  const [date, setDate] = useState<string | null>(todayISO());
  const [percent, setPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!changeId) return;
    getWaterChange(changeId).then((c) => {
      if (c) {
        setDate(c.changed_on);
        setPercent(numberText(c.percent));
        setNotes(c.notes ?? '');
      }
      setLoading(false);
    });
  }, [changeId]);

  if (loading) return <Loading />;

  async function save() {
    const pct = parseNumber(percent);
    if (percent.trim() !== '' && (pct === null || pct < 0 || pct > 100)) {
      setError('Percent changed must be a number from 0 to 100.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveWaterChange(changeId ?? null, {
        tank_id: id,
        changed_on: date ?? todayISO(),
        percent: pct,
        notes: blankToNull(notes),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this water change?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWaterChange(changeId!);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <DateField label="Date" value={date} onChange={setDate} />
      <NumberField label="Percent changed (%)" value={percent} onChangeText={setPercent} />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="e.g. added salt, cleaned sponge filter" />
      <ErrorText message={error} />
      <Button title={changeId ? 'Save changes' : 'Save water change'} onPress={save} busy={busy} />
      {changeId ? <Button title="Delete water change" variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}
