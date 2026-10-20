import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, ChipSelect, DateField, ErrorText, Field, Loading, Muted, NumberField, Screen } from '@/components/ui';
import { attempt } from '@/lib/alerts';
import { deleteCustomReminder, getCustomReminder, getFish, getTank, saveCustomReminder } from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';
import { addDays } from '@/lib/reminders';

const SUGGESTIONS = [
  'Move to conditioning',
  'Check for gravid females',
  'Photograph for records',
  'Re-test water',
  'End quarantine',
].map((s) => ({ value: s, label: s }));

const REPEATS = [
  { value: 7, label: 'Every week' },
  { value: 14, label: 'Every 2 weeks' },
  { value: 28, label: 'Every 4 weeks' },
];

// Add or edit a reminder in your own words. Opened from Home, a fish or a tank; the last two
// tie the reminder to that fish or tank.
export default function CustomReminderScreen() {
  const params = useLocalSearchParams<{ reminderId?: string; fishId?: string; tankId?: string }>();
  const { reminderId } = params;
  const [loading, setLoading] = useState(true);
  const [fishId, setFishId] = useState<string | null>(params.fishId ?? null);
  const [tankId, setTankId] = useState<string | null>(params.tankId ?? null);
  const [about, setAbout] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<string | null>(addDays(todayISO(), 7));
  const [repeat, setRepeat] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let f = params.fishId ?? null;
      let t = params.tankId ?? null;
      if (reminderId) {
        const r = await getCustomReminder(reminderId);
        if (r) {
          setTitle(r.title);
          setDue(r.due_on);
          setRepeat(numberText(r.repeat_every_days));
          setNotes(r.notes ?? '');
          f = r.fish_id;
          t = r.tank_id;
          setFishId(f);
          setTankId(t);
        }
      }
      if (f) setAbout(`For fish ${(await getFish(f))?.fish_code ?? ''}`);
      else if (t) setAbout(`For tank ${(await getTank(t))?.tank_code ?? ''}`);
    })()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [reminderId, params.fishId, params.tankId]);

  if (loading) return <Loading />;

  async function save() {
    if (!title.trim()) {
      setError('Say what the reminder is for.');
      return;
    }
    const every = parseNumber(repeat);
    if (repeat.trim() !== '' && (every === null || !Number.isInteger(every) || every < 1 || every > 365)) {
      setError('Repeat must be a whole number of days, from 1 to 365.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveCustomReminder(reminderId ?? null, {
        title: title.trim(),
        due_on: due ?? todayISO(),
        repeat_every_days: every,
        fish_id: fishId,
        tank_id: tankId,
        notes: blankToNull(notes),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this reminder?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => attempt(() => deleteCustomReminder(reminderId!), () => router.back()),
      },
    ]);
  }

  const every = parseNumber(repeat);

  return (
    <Screen>
      {about ? <Muted>{about}</Muted> : null}
      <ChipSelect
        label="Common reminders"
        options={SUGGESTIONS}
        value={SUGGESTIONS.some((s) => s.value === title) ? title : null}
        onChange={(v) => v && setTitle(v)}
      />
      <Field label="Remind me to" value={title} onChangeText={setTitle} placeholder="e.g. Move show prospects to conditioning" />
      <DateField label="On" value={due} onChange={setDue} />
      <ChipSelect
        label="Repeat"
        options={REPEATS}
        value={REPEATS.some((r) => r.value === every) ? every : null}
        onChange={(v) => setRepeat(v ? String(v) : '')}
        allowClear
      />
      <NumberField
        label="Repeat every (days)"
        value={repeat}
        onChangeText={setRepeat}
        hint="Leave blank for a one-off. Marking a repeating reminder done moves it on by this many days."
      />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={error} />
      <Button title={reminderId ? 'Save changes' : 'Save reminder'} onPress={save} busy={busy} />
      {reminderId ? <Button title="Delete reminder" variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}
