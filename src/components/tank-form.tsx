import { useState } from 'react';

import { Button, ChipSelect, ErrorText, Field, NumberField } from '@/components/ui';
import { TANK_PURPOSES, type TankPurpose } from '@/lib/constants';
import type { TankInput } from '@/lib/db';
import { blankToNull, numberText, parseNumber } from '@/lib/format';
import type { Tank } from '@/lib/types';

// The water change schedule is optional, but when given it must be 1 to 90 whole days.
function everyProblem(text: string): string | null {
  const days = parseNumber(text);
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 90)) {
    return 'Water change schedule must be a whole number of days, from 1 to 90.';
  }
  return null;
}

export function TankForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Tank;
  submitLabel: string;
  onSubmit: (input: TankInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [size, setSize] = useState(numberText(initial?.size_gallons));
  const [purpose, setPurpose] = useState<TankPurpose | null>(initial?.purpose ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [every, setEvery] = useState(numberText(initial?.water_change_every_days));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [everyError, setEveryError] = useState<string | null>(null);

  async function submit() {
    if (!purpose) {
      setError('Pick a purpose for the tank.');
      return;
    }
    const problem = everyProblem(every);
    setEveryError(problem);
    if (problem) {
      setError(problem);
      return;
    }
    const everyDays = parseNumber(every);
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: blankToNull(name),
        size_gallons: parseNumber(size),
        purpose,
        notes: blankToNull(notes),
        water_change_every_days: everyDays,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Rack A, top left" />
      <NumberField label="Size (gallons)" value={size} onChangeText={setSize} />
      <ChipSelect label="Purpose" options={TANK_PURPOSES} value={purpose} onChange={setPurpose} />
      <NumberField
        label="Water change every (days)"
        value={every}
        onChangeText={(text) => {
          setEvery(text);
          // Once flagged, the error clears as soon as the value is fixed.
          if (everyError) setEveryError(everyProblem(text));
        }}
        onBlur={() => setEveryError(everyProblem(every))}
        error={everyError}
        hint={"Leave empty if you don't want reminders for this tank."}
      />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={error} />
      <Button title={submitLabel} onPress={submit} busy={busy} />
    </>
  );
}
