import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { tankLabel } from '@/components/group-form';
import {
  Button,
  ChipSelect,
  DateField,
  ErrorText,
  Field,
  Loading,
  Muted,
  NumberField,
  Screen,
  ToggleField,
} from '@/components/ui';
import { labelOf, SPAWN_EVENT_KINDS, type SpawnEventKind } from '@/lib/constants';
import {
  deleteSpawnEvent,
  getSpawn,
  listPicks,
  listSpawnEvents,
  listTanks,
  saveSpawnEvent,
  updateSpawn,
} from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';
import { summarizeBatch } from '@/lib/spawn';
import type { Tank } from '@/lib/types';
import { attempt } from '@/lib/alerts';

const TITLES: Record<SpawnEventKind, string> = {
  move: 'Move fry',
  loss: 'Log losses',
  sexing: 'Sexing',
  cull: 'Cull',
};

// Reads a whole-number field. Blank counts as missing.
function wholeNumber(text: string): number | null {
  const n = parseNumber(text);
  return n !== null && Number.isInteger(n) && n >= 0 ? n : null;
}

export default function SpawnEventScreen() {
  const { id, kind, eventId } = useLocalSearchParams<{ id: string; kind: SpawnEventKind; eventId?: string }>();
  const [loading, setLoading] = useState(true);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [date, setDate] = useState<string | null>(todayISO());
  const [count, setCount] = useState('');
  const [wholeBatch, setWholeBatch] = useState(!eventId);
  const [toTankId, setToTankId] = useState<string | null>(null);
  const [males, setMales] = useState('');
  const [females, setFemales] = useState('');
  const [unknown, setUnknown] = useState('');
  const [reason, setReason] = useState('');
  const [forSale, setForSale] = useState(false);
  const [soldOn, setSoldOn] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSpawn(id), listSpawnEvents([id]), listPicks(id), listTanks()])
      .then(([spawn, events, picks, allTanks]) => {
        setTanks(allTanks);
        if (spawn) setRemaining(summarizeBatch(spawn, events, picks).remaining);
        const e = eventId ? events.find((x) => x.id === eventId) : null;
        if (e) {
          setDate(e.happened_on);
          setCount(numberText(e.count));
          setToTankId(e.to_tank_id);
          setMales(numberText(e.males));
          setFemales(numberText(e.females));
          setUnknown(numberText(e.unknown));
          setReason(e.reason ?? '');
          setForSale(e.for_sale);
          setSoldOn(e.sold_on);
          setNotes(e.notes ?? '');
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [id, eventId]);

  if (loading) return <Loading />;

  async function save() {
    const n = kind === 'move' && wholeBatch ? remaining : wholeNumber(count);
    if (kind !== 'sexing' && n === null) {
      setError('Enter how many fry, as a whole number.');
      return;
    }
    if (kind === 'move' && !toTankId) {
      setError('Choose the tank the fry moved to.');
      return;
    }
    const m = wholeNumber(males);
    const f = wholeNumber(females);
    const u = wholeNumber(unknown);
    if (kind === 'sexing' && [males, females, unknown].some((t, i) => t.trim() !== '' && [m, f, u][i] === null)) {
      setError('Counts must be whole numbers.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveSpawnEvent(eventId ?? null, {
        spawn_id: id,
        kind,
        happened_on: date ?? todayISO(),
        count: kind === 'sexing' ? null : n,
        to_tank_id: kind === 'move' ? toTankId : null,
        males: kind === 'sexing' ? m ?? 0 : null,
        females: kind === 'sexing' ? f ?? 0 : null,
        unknown: kind === 'sexing' ? u ?? 0 : null,
        reason: kind === 'loss' || kind === 'cull' ? blankToNull(reason) : null,
        for_sale: kind === 'cull' && forSale,
        sold_on: kind === 'cull' && forSale ? soldOn : null,
        notes: blankToNull(notes),
      });
      // Moving the whole batch changes the tank the spawn lives in.
      if (kind === 'move' && wholeBatch && !eventId) await updateSpawn(id, { tank_id: toTankId });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(`Delete this ${labelOf(SPAWN_EVENT_KINDS, kind).toLowerCase()} entry?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => attempt(() => deleteSpawnEvent(eventId!), () => router.back()),
      },
    ]);
  }

  const sexed = (wholeNumber(males) ?? 0) + (wholeNumber(females) ?? 0) + (wholeNumber(unknown) ?? 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: TITLES[kind] }} />
      <Muted>{remaining} fry in the batch now.</Muted>
      <DateField label="Date" value={date} onChange={setDate} />

      {kind === 'move' ? (
        <>
          {!eventId ? (
            <ToggleField label={`Move the whole batch (${remaining})`} value={wholeBatch} onChange={setWholeBatch} />
          ) : null}
          {!wholeBatch ? (
            <NumberField label="Number of fry moved" value={count} onChangeText={setCount} keyboardType="number-pad" />
          ) : null}
          <ChipSelect
            label="Moved to"
            options={tanks.map((t) => ({ value: t.id, label: tankLabel(t) }))}
            value={toTankId}
            onChange={setToTankId}
          />
          {!wholeBatch ? <Muted>Part of the batch moves. The spawn stays listed under its current tank.</Muted> : null}
        </>
      ) : null}

      {kind === 'loss' || kind === 'cull' ? (
        <NumberField
          label={kind === 'loss' ? 'Number lost' : 'Number culled'}
          value={count}
          onChangeText={setCount}
          keyboardType="number-pad"
        />
      ) : null}
      {kind === 'loss' ? (
        <Field label="Cause" value={reason} onChangeText={setReason} placeholder="Optional, e.g. ammonia spike" />
      ) : null}
      {kind === 'cull' ? (
        <>
          <Field
            label="Reasons"
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="e.g. bent spine, short dorsal, poor colour"
          />
          <ToggleField label="For sale" value={forSale} onChange={setForSale} />
          {forSale ? <DateField label="Sold on" value={soldOn} onChange={setSoldOn} optional /> : null}
        </>
      ) : null}

      {kind === 'sexing' ? (
        <>
          <NumberField label="Males" value={males} onChangeText={setMales} keyboardType="number-pad" />
          <NumberField label="Females" value={females} onChangeText={setFemales} keyboardType="number-pad" />
          <NumberField label="Still unknown" value={unknown} onChangeText={setUnknown} keyboardType="number-pad" />
          {sexed > 0 && sexed !== remaining ? (
            <Muted>
              These add up to {sexed}, but the batch has {remaining}. Log any losses first if the count is off.
            </Muted>
          ) : null}
        </>
      ) : null}

      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={error} />
      <Button title={eventId ? 'Save changes' : 'Save'} onPress={save} busy={busy} />
      {eventId ? <Button title="Delete entry" variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}
