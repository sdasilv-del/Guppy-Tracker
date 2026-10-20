import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card, ErrorText, Field, InfoRow, Loading, Muted, NumberField, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { getShowEntry, saveShowEntry } from '@/lib/db';
import { blankToNull, formatDate, numberText, parseNumber } from '@/lib/format';
import type { ShowEntry } from '@/lib/types';

// A show entry made from an official score. The show, date and placing come from the score;
// the class, points and notes are added here.
export default function ShowEntryScreen() {
  const { id, entryId } = useLocalSearchParams<{ id: string; entryId: string }>();
  const [entry, setEntry] = useState<ShowEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClass, setShowClass] = useState('');
  const [points, setPoints] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShowEntry(entryId)
      .then((e) => {
        if (e) {
          setEntry(e);
          setShowClass(e.show_class ?? '');
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
  if (!entry) return <Screen><ErrorText message={error ?? 'Show entry not found.'} /></Screen>;

  async function save() {
    const pts = parseNumber(points);
    if (points.trim() !== '' && pts === null) {
      setError('Points must be a number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveShowEntry(entry!.id, {
        fish_id: id,
        show_name: entry!.show_name,
        shown_on: entry!.shown_on,
        show_class: blankToNull(showClass),
        placement: entry!.placement,
        points: pts,
        notes: blankToNull(notes),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <InfoRow label="Show" value={entry.show_name} />
        <InfoRow label="Date" value={formatDate(entry.shown_on)} />
        <InfoRow label="Placing" value={entry.placement} />
      </Card>
      <Muted>The show, date and placing come from the official score. Change them there.</Muted>
      {entry.evaluation_id ? (
        <Button
          title="Open the score"
          icon={Icons.evaluation}
          variant="secondary"
          small
          onPress={() => router.push({ pathname: '/fish/[id]/evaluation', params: { id, evalId: entry.evaluation_id! } })}
        />
      ) : null}
      <Field label="Class" value={showClass} onChangeText={setShowClass} placeholder="e.g. A2 Triangle, male" />
      <NumberField label="Points" value={points} onChangeText={setPoints} placeholder="Optional" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={error} />
      <Button title="Save changes" onPress={save} busy={busy} />
    </Screen>
  );
}
