import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { FishPicker, fishLabel } from '@/components/fish-picker';
import { TailGuide } from '@/components/tail-guide';
import {
  Button,
  Card,
  ChipSelect,
  DateField,
  ErrorText,
  Field,
  Muted,
  MultiChipSelect,
  ToggleField,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  BASE_COLOURS,
  COVER_COLOURS,
  FISH_STATUSES,
  type FishStatus,
  ORIGINS,
  type Origin,
  SEXES,
  type Sex,
  TAIL_OPTIONS,
  type TailStandard,
} from '@/lib/constants';
import type { FishInput } from '@/lib/db';
import { blankToNull } from '@/lib/format';
import type { Fish, Tank } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

export type PickedPhoto = { uri: string; base64: string; mimeType: string };

export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
    base64: true,
    allowsEditing: true,
  };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]?.base64) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, base64: asset.base64!, mimeType: asset.mimeType ?? 'image/jpeg' };
}

function ParentField({
  label,
  value,
  candidates,
  onChange,
}: {
  label: string;
  value: string | null;
  candidates: Fish[];
  onChange: (id: string | null) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = candidates.find((f) => f.id === value);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, { color: current ? theme.text : theme.textSecondary }]}>
          {current ? fishLabel(current) : 'Unknown'}
        </Text>
        <Button title={open ? 'Close' : 'Choose'} variant="secondary" small onPress={() => setOpen(!open)} />
        {value ? <Button title="Unknown" variant="secondary" small onPress={() => onChange(null)} /> : null}
      </View>
      {open ? (
        <FishPicker
          fish={candidates}
          selected={value ? [value] : []}
          onToggle={(id) => {
            onChange(id === value ? null : id);
            setOpen(false);
          }}
          emptyText="No fish to choose from yet."
        />
      ) : null}
    </View>
  );
}

export function FishForm({
  initial,
  defaults,
  allFish,
  tanks,
  initialTankId,
  submitLabel,
  onSubmit,
  againLabel,
  onSubmitAgain,
}: {
  initial?: Fish;
  defaults?: Partial<FishInput>;
  allFish: Fish[];
  tanks: Tank[];
  initialTankId?: string;
  submitLabel: string;
  onSubmit: (input: FishInput, photo: PickedPhoto | null) => Promise<void>;
  // An optional second save button, e.g. "Save and pick another".
  againLabel?: string;
  onSubmitAgain?: (input: FishInput, photo: PickedPhoto | null) => Promise<void>;
}) {
  // A new fish can start from suggested values, e.g. a fry picked from a spawn.
  const seed: Partial<FishInput> = initial ?? defaults ?? {};
  const [name, setName] = useState(seed.name ?? '');
  const [sex, setSex] = useState<Sex>(seed.sex ?? 'U');
  const [tail, setTail] = useState<TailStandard | null>(seed.tail_standard ?? null);
  const [baseColour, setBaseColour] = useState<number | null>(seed.base_colour ?? null);
  const [coverColours, setCoverColours] = useState<number[]>(seed.cover_colours ?? []);
  const [strain, setStrain] = useState(seed.strain ?? '');
  const [dob, setDob] = useState<string | null>(seed.date_of_birth ?? null);
  const [generation, setGeneration] = useState(seed.generation ?? '');
  const [origin, setOrigin] = useState<Origin>(seed.origin ?? 'bred');
  const [foundation, setFoundation] = useState(seed.foundation ?? false);
  const [originalBreeder, setOriginalBreeder] = useState(seed.original_breeder ?? '');
  const [sireId, setSireId] = useState<string | null>(seed.sire_id ?? null);
  const [damId, setDamId] = useState<string | null>(seed.dam_id ?? null);
  const [tankId, setTankId] = useState<string | null>(seed.tank_id ?? initialTankId ?? null);
  const [status, setStatus] = useState<FishStatus>(seed.status ?? 'breeder');
  const [notes, setNotes] = useState(seed.notes ?? '');
  const [pickReason, setPickReason] = useState(seed.pick_reason ?? '');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [showTailGuide, setShowTailGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = {
    name, sex, tail, baseColour, coverColours, strain, dob, generation, origin, foundation,
    originalBreeder, sireId, damId, tankId, status, notes, pickReason, photo: photo?.uri ?? null,
  };
  const [startValues] = useState(() => JSON.stringify(values));
  const { allowLeave, blockLeave } = useUnsavedChanges(JSON.stringify(values) !== startValues);

  const others = allFish.filter((f) => f.id !== initial?.id);
  const strains = Array.from(new Set(allFish.map((f) => f.strain).filter((s): s is string => !!s))).sort();
  const sexChanges = initial && (initial.sex !== sex || initial.tail_standard !== tail);

  async function addPhoto(source: 'camera' | 'library') {
    const picked = await pickPhoto(source);
    if (picked) setPhoto(picked);
  }

  async function submit(action = onSubmit) {
    if (!tail) {
      setError('Pick the tail standard, or "Not sure yet".');
      return;
    }
    setBusy(true);
    setError(null);
    allowLeave();
    try {
      await action(
        {
          name: blankToNull(name),
          sex,
          tail_standard: tail,
          base_colour: baseColour,
          cover_colours: coverColours,
          strain: blankToNull(strain),
          date_of_birth: dob,
          generation: blankToNull(generation),
          origin,
          foundation,
          original_breeder: blankToNull(originalBreeder),
          sire_id: sireId,
          dam_id: damId,
          tank_id: tankId,
          status,
          notes: blankToNull(notes),
          spawn_id: seed.spawn_id ?? null,
          pick_reason: seed.spawn_id ? blankToNull(pickReason) : null,
        },
        photo,
      );
    } catch (e) {
      blockLeave();
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      {!initial ? (
        <Card>
          {photo ? <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" /> : null}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button title="Take photo" variant="secondary" small onPress={() => addPhoto('camera')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Choose photo" variant="secondary" small onPress={() => addPhoto('library')} />
            </View>
          </View>
        </Card>
      ) : null}

      {seed.spawn_id ? (
        <Field
          label="Why it was picked"
          value={pickReason}
          onChangeText={setPickReason}
          multiline
          placeholder="e.g. best dorsal in the batch, strong colour"
        />
      ) : null}
      <ChipSelect label="Sex" options={SEXES} value={sex} onChange={(v) => v && setSex(v)} />
      <ChipSelect label="Tail standard (IKGH)" options={TAIL_OPTIONS} value={tail} onChange={setTail} />
      <Button
        title={showTailGuide ? 'Hide tail pictures' : 'Not sure? See what each tail looks like'}
        variant="secondary"
        small
        onPress={() => setShowTailGuide(!showTailGuide)}
      />
      {showTailGuide ? (
        <TailGuide
          value={tail}
          onPick={(t) => {
            setTail(t);
            setShowTailGuide(false);
          }}
        />
      ) : null}
      {tail === 'U' ? (
        <Muted>You can pick the tail later. The fish gets a new ID then, and this one stays searchable.</Muted>
      ) : null}
      {sexChanges ? (
        <Muted>
          Changing sex or tail standard gives this fish a new ID. Its current ID {initial.fish_code} stays searchable.
        </Muted>
      ) : null}
      <Muted>
        Base colour is the body underneath. Cover colour is the colour and pattern on top. Not sure? Leave both blank
        and add them later.
      </Muted>
      <ChipSelect
        label="Base colour (IKGH)"
        options={BASE_COLOURS}
        value={baseColour}
        onChange={setBaseColour}
        allowClear
      />
      <MultiChipSelect
        label="Cover colour (IKGH)"
        options={COVER_COLOURS}
        value={coverColours}
        onChange={setCoverColours}
      />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Optional" />
      <Field label="Strain" value={strain} onChangeText={setStrain} />
      {strains.length > 0 ? (
        <ChipSelect
          label="Strains you've used"
          options={strains.map((s) => ({ value: s, label: s }))}
          value={strain}
          onChange={(v) => setStrain(v ?? '')}
        />
      ) : null}
      <DateField label="Date of birth" value={dob} onChange={setDob} optional />
      <Field label="Generation" value={generation} onChangeText={setGeneration} placeholder="e.g. F2" />
      <ChipSelect label="Origin" options={ORIGINS} value={origin} onChange={(v) => v && setOrigin(v)} />
      <ToggleField label="Foundation fish" value={foundation} onChange={setFoundation} />
      <Field label="Original breeder" value={originalBreeder} onChangeText={setOriginalBreeder} />
      <ParentField
        label="Sire"
        value={sireId}
        candidates={others.filter((f) => f.sex === 'M' || f.id === sireId)}
        onChange={setSireId}
      />
      <ParentField
        label="Dam"
        value={damId}
        candidates={others.filter((f) => f.sex === 'F' || f.id === damId)}
        onChange={setDamId}
      />
      <ChipSelect
        label="Tank"
        options={tanks.map((t) => ({ value: t.id, label: t.name ? `${t.tank_code} ${t.name}` : t.tank_code }))}
        value={tankId}
        onChange={setTankId}
        allowClear
      />
      {tanks.find((t) => t.id === tankId)?.purpose === 'cull' ? (
        <Muted>This is a cull tank, so the fish will be marked Culled.</Muted>
      ) : null}
      <ChipSelect label="Status" options={FISH_STATUSES} value={status} onChange={(v) => v && setStatus(v)} />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={error} />
      <Button title={submitLabel} onPress={() => submit()} busy={busy} />
      {againLabel && onSubmitAgain ? (
        <Button title={againLabel} variant="secondary" onPress={() => submit(onSubmitAgain)} disabled={busy} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one + 2 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  value: { flex: 1, fontSize: 16 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10 },
});
