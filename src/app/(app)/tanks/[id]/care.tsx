import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, ChipSelect, DateField, ErrorText, Field, Loading, NumberField, Screen } from '@/components/ui';
import { attempt } from '@/lib/alerts';
import { deleteCareLog, getCareLog, recentCareItems, saveCareLog } from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';
import type { CareKind } from '@/lib/types';

const KINDS = [
  { value: 'feeding', label: 'Feeding' },
  { value: 'treatment', label: 'Treatment' },
] as const;

// Log what a tank was fed or treated with. Opens on the kind passed in, and offers recent foods
// or medications as one-tap choices.
export default function CareLogScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: CareKind; logId?: string }>();
  const { id, logId } = params;
  const [loading, setLoading] = useState(!!logId);
  const [kind, setKind] = useState<CareKind>(params.kind ?? 'feeding');
  const [date, setDate] = useState<string | null>(todayISO());
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [notes, setNotes] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logId) return;
    getCareLog(logId)
      .then((c) => {
        if (c) {
          setKind(c.kind);
          setDate(c.logged_on);
          setItem(c.item);
          setAmount(c.amount ?? '');
          setDays(numberText(c.course_days));
          setNotes(c.notes ?? '');
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [logId]);

  useEffect(() => {
    recentCareItems(kind)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, [kind]);

  if (loading) return <Loading />;

  const treatment = kind === 'treatment';

  async function save() {
    if (!item.trim()) {
      setError(treatment ? 'Enter the medication or treatment.' : 'Enter the food.');
      return;
    }
    const courseDays = treatment ? parseNumber(days) : null;
    if (treatment && days.trim() !== '' && (courseDays === null || !Number.isInteger(courseDays) || courseDays < 1 || courseDays > 60)) {
      setError('Course length must be a whole number of days, from 1 to 60.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveCareLog(logId ?? null, {
        tank_id: id,
        kind,
        logged_on: date ?? todayISO(),
        item: item.trim(),
        amount: blankToNull(amount),
        course_days: courseDays,
        notes: blankToNull(notes),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(treatment ? 'Delete this treatment?' : 'Delete this feeding?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => attempt(() => deleteCareLog(logId!), () => router.back()),
      },
    ]);
  }

  const recentOptions = recent.map((r) => ({ value: r, label: r }));

  return (
    <Screen>
      <ChipSelect label="Type" options={KINDS} value={kind} onChange={(v) => v && setKind(v)} />
      <DateField label="Date" value={date} onChange={setDate} />
      {recentOptions.length > 0 ? (
        <ChipSelect
          label={treatment ? 'Used before' : 'Fed before'}
          options={recentOptions}
          value={recent.includes(item.trim()) ? item.trim() : null}
          onChange={(v) => v && setItem(v)}
        />
      ) : null}
      <Field
        label={treatment ? 'Medication or treatment' : 'Food'}
        value={item}
        onChangeText={setItem}
        placeholder={treatment ? 'e.g. Aquarium salt, Paraguard' : 'e.g. Baby brine shrimp, flakes'}
      />
      <Field
        label={treatment ? 'Dose' : 'Amount'}
        value={amount}
        onChangeText={setAmount}
        placeholder={treatment ? 'e.g. 1 tbsp per 5 gal' : 'e.g. 2 ml, a pinch'}
      />
      {treatment ? (
        <NumberField
          label="Course length (days)"
          value={days}
          onChangeText={setDays}
          hint="The tank shows the treatment as running until the course ends."
        />
      ) : null}
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={error} />
      <Button title={logId ? 'Save changes' : treatment ? 'Save treatment' : 'Save feeding'} onPress={save} busy={busy} />
      {logId ? <Button title={treatment ? 'Delete treatment' : 'Delete feeding'} variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}
