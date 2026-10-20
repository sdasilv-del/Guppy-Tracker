import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, ChipSelect, DateField, ErrorText, Field, Loading, Muted, NumberField, Screen } from '@/components/ui';
import { attempt } from '@/lib/alerts';
import {
  deleteCustomReminder,
  getCustomReminder,
  getFish,
  getTank,
  listTanks,
  saveCustomReminder,
  setWaterChangeSchedule,
} from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';
import { addDays } from '@/lib/reminders';
import type { Tank } from '@/lib/types';

const SUGGESTIONS = [
  'Move to conditioning',
  'Check for gravid females',
  'Photograph for records',
  'Re-test water',
  'End quarantine',
].map((s) => ({ value: s, label: s }));

const KINDS = [
  { value: 'own', label: 'Your own' },
  { value: 'feeding', label: 'Feeding' },
  { value: 'water', label: 'Water change' },
] as const;

type Kind = (typeof KINDS)[number]['value'];

const tankLabel = (t: Tank) => (t.name ? `${t.tank_code} ${t.name}` : t.tank_code);

const FEED_REPEATS = [
  { value: 1, label: 'Every day' },
  { value: 2, label: 'Every 2 days' },
  { value: 7, label: 'Every week' },
];

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
  const [kind, setKind] = useState<Kind>('own');
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setTanks(await listTanks());
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

  // Feeding is a repeating reminder for a tank; a water change sets the tank's schedule instead.
  function pickKind(next: Kind) {
    setKind(next);
    if (next === 'feeding') {
      setRepeat('1');
      setDue(todayISO());
      setTitle(tankTitle('Feed', tankId));
    } else if (next === 'water') {
      const tank = tanks.find((t) => t.id === tankId);
      setRepeat(numberText(tank?.water_change_every_days ?? 7));
    } else {
      setTitle('');
      setRepeat('');
      setDue(addDays(todayISO(), 7));
    }
  }

  function tankTitle(verb: string, id: string | null) {
    const tank = tanks.find((t) => t.id === id);
    return tank ? `${verb} ${tankLabel(tank)}` : `${verb} the fish`;
  }

  function pickTank(id: string | null) {
    setTankId(id);
    if (kind === 'feeding') setTitle(tankTitle('Feed', id));
    const tank = tanks.find((t) => t.id === id);
    if (kind === 'water' && tank?.water_change_every_days) setRepeat(String(tank.water_change_every_days));
  }

  async function saveWaterChange() {
    const every = parseNumber(repeat);
    if (!tankId) {
      setError('Choose the tank.');
      return;
    }
    if (every === null || !Number.isInteger(every) || every < 1 || every > 365) {
      setError('Enter how often, as a whole number of days from 1 to 365.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setWaterChangeSchedule(tankId, every);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function save() {
    if (kind === 'water') return saveWaterChange();
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
      {!reminderId && !params.fishId ? (
        <ChipSelect label="Kind" options={KINDS} value={kind} onChange={(v) => v && pickKind(v)} />
      ) : null}
      {kind !== 'own' && tanks.length > 0 ? (
        <ChipSelect
          label={kind === 'water' ? 'Tank' : 'Tank (optional)'}
          options={tanks.map((t) => ({ value: t.id, label: tankLabel(t) }))}
          value={tankId}
          onChange={pickTank}
          allowClear={kind === 'feeding'}
        />
      ) : null}
      {kind === 'water' ? (
        <>
          <ChipSelect
            label="How often"
            options={REPEATS}
            value={REPEATS.some((r) => r.value === every) ? every : null}
            onChange={(v) => setRepeat(v ? String(v) : '')}
          />
          <NumberField label="Every (days)" value={repeat} onChangeText={setRepeat} />
          <Muted>
            This sets the tank&apos;s water change schedule. The reminder counts from the last water change you log, so logging one moves it on.
          </Muted>
          <ErrorText message={error} />
          <Button title="Save water change reminder" onPress={save} busy={busy} />
        </>
      ) : (
        <>
          {kind === 'own' ? (
            <ChipSelect
              label="Common reminders"
              options={SUGGESTIONS}
              value={SUGGESTIONS.some((s) => s.value === title) ? title : null}
              onChange={(v) => v && setTitle(v)}
            />
          ) : null}
          <Field label="Remind me to" value={title} onChangeText={setTitle} placeholder="e.g. Move show prospects to conditioning" />
          <DateField label="On" value={due} onChange={setDue} />
          <ChipSelect
            label="Repeat"
            options={kind === 'feeding' ? FEED_REPEATS : REPEATS}
            value={(kind === 'feeding' ? FEED_REPEATS : REPEATS).some((r) => r.value === every) ? every : null}
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
        </>
      )}
    </Screen>
  );
}
