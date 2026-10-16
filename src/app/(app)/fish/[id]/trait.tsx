import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { NewTraitField } from '@/components/new-trait-field';
import { Button, ChipSelect, DateField, ErrorText, Field, Loading, Muted, NumberField, Screen } from '@/components/ui';
import { deleteFishTrait, getFishTrait, listTraits, saveFishTrait } from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';
import type { Trait } from '@/lib/types';
import { attempt } from '@/lib/alerts';

export default function FishTraitScreen() {
  const { id, recordId, traitId: presetTrait } = useLocalSearchParams<{
    id: string;
    recordId?: string;
    traitId?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [traits, setTraits] = useState<Trait[]>([]);
  const [traitId, setTraitId] = useState<string | null>(presetTrait ?? null);
  const [date, setDate] = useState<string | null>(todayISO());
  const [value, setValue] = useState('');
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listTraits(), recordId ? getFishTrait(recordId) : null])
      .then(([all, record]) => {
        setTraits(all);
        if (record) {
          setTraitId(record.trait_id);
          setDate(record.recorded_on);
          setValue(record.value ?? '');
          setScore(numberText(record.score));
          setNotes(record.notes ?? '');
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [recordId]);

  if (loading) return <Loading />;

  async function save() {
    const n = parseNumber(score);
    if (!traitId) {
      setError('Choose a trait, or add a new one.');
      return;
    }
    if (score.trim() !== '' && n === null) {
      setError('Score must be a number.');
      return;
    }
    if (!value.trim() && n === null && !notes.trim()) {
      setError('Enter a value, a score or a note.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveFishTrait(recordId ?? null, {
        fish_id: id,
        trait_id: traitId,
        recorded_on: date ?? todayISO(),
        value: blankToNull(value),
        score: n,
        notes: blankToNull(notes),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this trait record?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => attempt(() => deleteFishTrait(recordId!), () => router.back()),
      },
    ]);
  }

  return (
    <Screen>
      <ChipSelect
        label="Trait"
        options={traits.map((t) => ({ value: t.id, label: t.name }))}
        value={traitId}
        onChange={setTraitId}
      />
      <NewTraitField
        traits={traits}
        onAdded={(trait, isNew) => {
          if (isNew) setTraits([...traits, trait].sort((a, b) => a.name.localeCompare(b.name)));
          setTraitId(trait.id);
        }}
      />
      <DateField label="Date" value={date} onChange={setDate} />
      <Field label="Value" value={value} onChangeText={setValue} placeholder="e.g. long, rounded, deep red" />
      <NumberField label="Score" value={score} onChangeText={setScore} placeholder="Optional, any scale you use" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Muted>Record the same trait again later to track how it changes as the fish grows.</Muted>
      <ErrorText message={error} />
      <Button title={recordId ? 'Save changes' : 'Save trait'} onPress={save} busy={busy} />
      {recordId ? <Button title="Delete trait record" variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}
