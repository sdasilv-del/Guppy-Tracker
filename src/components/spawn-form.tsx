import { useState } from 'react';

import { tankLabel } from '@/components/group-form';
import { Button, ChipSelect, DateField, ErrorText, Field, Muted, NumberField } from '@/components/ui';
import { INACTIVE_STATUSES } from '@/lib/constants';
import type { SpawnInput } from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';
import { nextGeneration } from '@/lib/spawn';
import type { BreedingGroup, Fish, Spawn, Tank } from '@/lib/types';

const UNKNOWN = 'unknown';

function groupLabel(g: BreedingGroup): string {
  return g.name ? `${g.group_code} ${g.name}` : g.group_code;
}

// The fry count is the one thing every spawn needs.
function fryCountProblem(text: string): string | null {
  const count = parseNumber(text);
  return count === null || count < 0 || !Number.isInteger(count)
    ? 'Enter the number of fry as a whole number.'
    : null;
}

export function SpawnForm({
  initial,
  initialGroupId,
  groups,
  membersByGroup,
  allFish,
  tanks,
  submitLabel,
  onSubmit,
}: {
  initial?: Spawn;
  initialGroupId?: string;
  groups: BreedingGroup[];
  membersByGroup: Record<string, string[]>;
  allFish: Fish[];
  tanks: Tank[];
  submitLabel: string;
  onSubmit: (input: SpawnInput) => Promise<void>;
}) {
  const byId = Object.fromEntries(allFish.map((f) => [f.id, f]));

  // Suggested parents, tank, strain and generation for a new spawn from a group.
  function defaultsFor(groupId: string | null) {
    const group = groups.find((g) => g.id === groupId);
    const members = (groupId ? membersByGroup[groupId] ?? [] : []).map((id) => byId[id]).filter(Boolean);
    const males = members.filter((f) => f.sex === 'M');
    const females = members.filter((f) => f.sex === 'F');
    const sire = males.length === 1 ? males[0] : null;
    const dam = females.length === 1 ? females[0] : null;
    // With several males or females the parents stay open, but strain and generation can still
    // come from the group: the strain when every member shares one, the generation after the newest.
    const strains = new Set(members.map((f) => f.strain).filter(Boolean));
    const sharedStrain = strains.size === 1 ? [...strains][0] : null;
    return {
      sireId: sire?.id ?? null,
      damId: dam?.id ?? null,
      tankId: group?.tank_id ?? null,
      strain: sire?.strain ?? dam?.strain ?? sharedStrain ?? '',
      generation: nextGeneration(sire, dam) ?? nextGeneration(...members) ?? '',
    };
  }

  const start = initial
    ? {
        sireId: initial.sire_id,
        damId: initial.dam_id,
        tankId: initial.tank_id,
        strain: initial.strain ?? '',
        generation: initial.generation ?? '',
      }
    : defaultsFor(initialGroupId ?? null);

  const [groupId, setGroupId] = useState<string | null>(initial?.group_id ?? initialGroupId ?? null);
  const [sireId, setSireId] = useState<string | null>(start.sireId);
  const [damId, setDamId] = useState<string | null>(start.damId);
  const [bornOn, setBornOn] = useState<string | null>(initial?.born_on ?? todayISO());
  const [fryCount, setFryCount] = useState(numberText(initial?.fry_count));
  const [tankId, setTankId] = useState<string | null>(start.tankId);
  const [strain, setStrain] = useState(start.strain);
  const [generation, setGeneration] = useState(start.generation);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fryError, setFryError] = useState<string | null>(null);
  // Generation and notes sit under More details. Opened when editing a spawn that has notes.
  const [showMore, setShowMore] = useState(!!initial?.notes);

  function chooseGroup(id: string | null) {
    setGroupId(id);
    if (initial) return;
    const d = defaultsFor(id);
    setSireId(d.sireId);
    setDamId(d.damId);
    setTankId(d.tankId);
    setStrain(d.strain);
    setGeneration(d.generation);
  }

  // A new spawn's generation and strain follow the chosen parents.
  function chooseParents(nextSire: string | null, nextDam: string | null) {
    setSireId(nextSire);
    setDamId(nextDam);
    if (initial) return;
    const sire = nextSire ? byId[nextSire] : null;
    const dam = nextDam ? byId[nextDam] : null;
    setGeneration(nextGeneration(sire, dam) ?? generation);
    if (!strain) setStrain(sire?.strain ?? dam?.strain ?? '');
  }

  // Parents come from the group. Without a group, any fish still in the fish room can be chosen.
  const pool = groupId
    ? (membersByGroup[groupId] ?? []).map((id) => byId[id]).filter(Boolean)
    : allFish.filter((f) => !INACTIVE_STATUSES.includes(f.status));
  const withCurrent = (list: Fish[], id: string | null) =>
    id && byId[id] && !list.some((f) => f.id === id) ? [...list, byId[id]] : list;
  const sires = withCurrent(pool.filter((f) => f.sex === 'M'), sireId);
  const dams = withCurrent(pool.filter((f) => f.sex === 'F'), damId);
  const groupOptions = groups.filter((g) => !g.ended_on || g.id === groupId);

  async function submit() {
    const problem = fryCountProblem(fryCount);
    setFryError(problem);
    if (problem) {
      setError(problem);
      return;
    }
    const count = parseNumber(fryCount)!;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        group_id: groupId,
        sire_id: sireId,
        dam_id: damId,
        born_on: bornOn ?? todayISO(),
        fry_count: count,
        tank_id: tankId,
        strain: blankToNull(strain),
        generation: blankToNull(generation),
        notes: blankToNull(notes),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <ChipSelect
        label="Breeding group"
        options={groupOptions.map((g) => ({ value: g.id, label: groupLabel(g) }))}
        value={groupId}
        onChange={chooseGroup}
        allowClear
      />
      <ChipSelect
        label="Sire"
        options={sires.map((f) => ({ value: f.id, label: f.fish_code }))}
        value={sireId}
        onChange={(id) => chooseParents(id, damId)}
        allowClear
      />
      {sires.length === 0 ? <Muted>No males to choose from, so the sire is Unknown.</Muted> : null}
      <ChipSelect<string>
        label="Dam"
        options={[...dams.map((f) => ({ value: f.id, label: f.fish_code })), { value: UNKNOWN, label: 'Unknown' }]}
        value={damId ?? UNKNOWN}
        onChange={(id) => chooseParents(sireId, id === UNKNOWN ? null : id)}
      />
      <DateField label="Date of birth" value={bornOn} onChange={setBornOn} />
      <NumberField
        label="Fry count at birth"
        value={fryCount}
        onChangeText={(text) => {
          setFryCount(text);
          if (fryError) setFryError(fryCountProblem(text));
        }}
        onBlur={() => setFryError(fryCountProblem(fryCount))}
        error={fryError}
        keyboardType="number-pad"
      />
      <ChipSelect
        label="Tank"
        options={tanks.map((t) => ({ value: t.id, label: tankLabel(t) }))}
        value={tankId}
        onChange={setTankId}
        allowClear
      />
      <Field label="Strain" value={strain} onChangeText={setStrain} />
      {showMore ? (
        <>
          <Field label="Generation" value={generation} onChangeText={setGeneration} placeholder="e.g. F3" />
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
        </>
      ) : generation ? (
        <Muted>{`Generation ${generation}`}</Muted>
      ) : null}
      <Button
        title={showMore ? 'Fewer details' : 'More details'}
        variant="secondary"
        small
        onPress={() => setShowMore(!showMore)}
      />
      <ErrorText message={error} />
      <Button title={submitLabel} onPress={submit} busy={busy} />
    </>
  );
}
