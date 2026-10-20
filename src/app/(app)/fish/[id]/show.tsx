import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, DateField, ErrorText, Field, Loading, Muted, NumberField, Screen } from '@/components/ui';
import { attempt } from '@/lib/alerts';
import { deleteShowEntry, getShowEntry, saveShowEntry } from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';

export default function ShowEntryScreen() {
  const { id, entryId } = useLocalSearchParams<{ id: string; entryId?: string }>();
  const [loading, setLoading] = useState(!!entryId);
  const [show, setShow] = useState('');
  const [date, setDate] = useState<string | null>(todayISO());
  const [showClass, setShowClass] = useState('');
  const [placing, setPlacing] = useState('');
  const [points, setPoints] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryId) return;
    getShowEntry(entryId)
      .then((e) => {
        if (e) {
          setShow(e.show_name);
          setDate(e.shown_on);
          setShowClass(e.show_class ?? '');
          setPlacing(e.placement ?? '');
          setPoints(numberText(e.points));
          setNotes(e.notes ?? '');
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [entryId]);

  if (loading) return <Loading />;

  async function save() {
    const pts = parseNumber(points);
    if (!show.trim()) {
      setError('Enter the name of the show.');
      return;
    }
    if (points.trim() !== '' && pts === null) {
      setError('Points must be a number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveShowEntry(entryId ?? null, {
        fish_id: id,
        show_name: show.trim(),
        shown_on: date ?? todayISO(),
        show_class: blankToNull(showClass),
        placement: blankToNull(placing),
        points: pts,
        notes: blankToNull(notes),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this show entry?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => attempt(() => deleteShowEntry(entryId!), () => router.back()),
      },
    ]);
  }

  return (
    <Screen>
      <Field label="Show" value={show} onChangeText={setShow} placeholder="e.g. IKGH Spring Show" />
      <DateField label="Date" value={date} onChange={setDate} />
      <Field label="Class" value={showClass} onChangeText={setShowClass} placeholder="e.g. A2 Triangle, male" />
      <Field label="Placing" value={placing} onChangeText={setPlacing} placeholder="e.g. 1st, Best in Show" />
      <NumberField label="Points" value={points} onChangeText={setPoints} placeholder="Optional" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Muted>Record the judge&apos;s score sheet separately under IHS evaluations.</Muted>
      <ErrorText message={error} />
      <Button title={entryId ? 'Save changes' : 'Save show entry'} onPress={save} busy={busy} />
      {entryId ? <Button title="Delete show entry" variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}
