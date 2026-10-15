import { useState } from 'react';

import { Button, ChipSelect, ErrorText, Field, NumberField } from '@/components/ui';
import { TANK_PURPOSES, type TankPurpose } from '@/lib/constants';
import type { TankInput } from '@/lib/db';
import { blankToNull, numberText, parseNumber } from '@/lib/format';
import type { Tank } from '@/lib/types';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!purpose) {
      setError('Pick a purpose for the tank.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: blankToNull(name),
        size_gallons: parseNumber(size),
        purpose,
        notes: blankToNull(notes),
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
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={error} />
      <Button title={submitLabel} onPress={submit} busy={busy} />
    </>
  );
}
