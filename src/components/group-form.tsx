import { useState } from 'react';

import { FishPicker } from '@/components/fish-picker';
import { NewTraitField } from '@/components/new-trait-field';
import {
  Button,
  ChipSelect,
  DateField,
  ErrorText,
  Field,
  Muted,
  MultiChipSelect,
  ToggleField,
} from '@/components/ui';
import { INACTIVE_STATUSES } from '@/lib/constants';
import { type GroupInput } from '@/lib/db';
import { blankToNull, todayISO } from '@/lib/format';
import type { BreedingGroup, Fish, Tank, Trait } from '@/lib/types';

export function tankLabel(t: Tank): string {
  return t.name ? `${t.tank_code} ${t.name}` : t.tank_code;
}

export type GroupFormResult = {
  input: GroupInput;
  memberIds: string[];
  traitIds: string[];
  moveIntoTank: boolean;
};

export function GroupForm({
  initial,
  initialMemberIds = [],
  initialTraitIds = [],
  allFish,
  tanks,
  traits: initialTraits,
  submitLabel,
  onSubmit,
}: {
  initial?: BreedingGroup;
  initialMemberIds?: string[];
  initialTraitIds?: string[];
  allFish: Fish[];
  tanks: Tank[];
  traits: Trait[];
  submitLabel: string;
  onSubmit: (result: GroupFormResult) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [tankId, setTankId] = useState<string | null>(initial?.tank_id ?? null);
  const [startedOn, setStartedOn] = useState<string | null>(initial?.started_on ?? todayISO());
  const [endedOn, setEndedOn] = useState<string | null>(initial?.ended_on ?? null);
  const [goal, setGoal] = useState(initial?.goal ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [memberIds, setMemberIds] = useState<string[]>(initialMemberIds);
  const [traits, setTraits] = useState<Trait[]>(initialTraits);
  const [traitIds, setTraitIds] = useState<string[]>(initialTraitIds);
  const [moveIntoTank, setMoveIntoTank] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fish still in the fish room, plus any current member whatever its status.
  const candidates = allFish.filter((f) => !INACTIVE_STATUSES.includes(f.status) || memberIds.includes(f.id));
  const tankNames = Object.fromEntries(tanks.map((t) => [t.id, tankLabel(t)]));
  const members = allFish.filter((f) => memberIds.includes(f.id));
  const males = members.filter((f) => f.sex === 'M').length;
  const females = members.filter((f) => f.sex === 'F').length;

  async function submit() {
    if (males === 0 || females === 0) {
      setError('Choose at least one male and one female.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        input: {
          name: blankToNull(name),
          tank_id: tankId,
          started_on: startedOn ?? todayISO(),
          ended_on: endedOn,
          goal: blankToNull(goal),
          notes: blankToNull(notes),
        },
        memberIds,
        traitIds,
        moveIntoTank: moveIntoTank && !!tankId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Optional, e.g. Red delta line" />
      <Field
        label="Goal"
        value={goal}
        onChangeText={setGoal}
        multiline
        placeholder="What this breeding should achieve"
      />
      <MultiChipSelect
        label="Target traits"
        options={traits.map((t) => ({ value: t.id, label: t.name }))}
        value={traitIds}
        onChange={setTraitIds}
      />
      <NewTraitField
        traits={traits}
        onAdded={(trait, isNew) => {
          if (isNew) setTraits([...traits, trait].sort((a, b) => a.name.localeCompare(b.name)));
          if (!traitIds.includes(trait.id)) setTraitIds([...traitIds, trait.id]);
        }}
      />
      <ChipSelect
        label="Tank"
        options={tanks.map((t) => ({ value: t.id, label: tankLabel(t) }))}
        value={tankId}
        onChange={setTankId}
        allowClear
      />
      {tankId ? (
        <ToggleField label="Move the chosen fish into this tank" value={moveIntoTank} onChange={setMoveIntoTank} />
      ) : null}
      <DateField label="Date started" value={startedOn} onChange={setStartedOn} />
      {initial ? <DateField label="Date ended" value={endedOn} onChange={setEndedOn} optional /> : null}
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />

      <Muted>
        Fish in this group: {males} male{males === 1 ? '' : 's'}, {females} female{females === 1 ? '' : 's'}
        {members.length > males + females ? `, ${members.length - males - females} unknown` : ''}
      </Muted>
      <FishPicker
        fish={candidates}
        selected={memberIds}
        onToggle={(id) =>
          setMemberIds(memberIds.includes(id) ? memberIds.filter((m) => m !== id) : [...memberIds, id])
        }
        tankNames={tankNames}
        emptyText="No fish yet. Add fish first, then make a group."
      />
      <ErrorText message={error} />
      <Button title={submitLabel} onPress={submit} busy={busy} />
    </>
  );
}
