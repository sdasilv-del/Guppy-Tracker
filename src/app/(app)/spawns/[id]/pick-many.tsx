import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Body,
  Button,
  Card,
  ChipSelect,
  ErrorText,
  Field,
  Icon,
  Loading,
  Muted,
  Screen,
} from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FISH_STATUSES, type FishStatus, type Sex, TAIL_STANDARDS, type TailStandard } from '@/lib/constants';
import { createFish, getSpawn, listFish, listSpawnEvents, listTanks } from '@/lib/db';
import { summarizeBatch } from '@/lib/spawn';
import { useFocusData } from '@/lib/use-data';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

const PICK_STATUSES = FISH_STATUSES.filter((s) => ['show_prospect', 'breeder', 'for_sale'].includes(s.value));

function Stepper({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  const theme = useTheme();
  const button = (sign: -1 | 1) => {
    const disabled = sign < 0 ? value === 0 : value >= max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${sign < 0 ? 'One fewer' : 'One more'} ${label.toLowerCase()}`}
        disabled={disabled}
        hitSlop={6}
        onPress={() => onChange(value + sign)}
        style={({ pressed }) => [
          styles.stepButton,
          { backgroundColor: theme.backgroundSelected, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        ]}>
        <Icon name={sign < 0 ? { ios: 'minus', android: 'remove' } : Icons.add} size={18} />
      </Pressable>
    );
  };
  return (
    <View style={styles.stepRow} accessibilityLabel={`${label}: ${value}`}>
      <Body style={styles.stepLabel}>{label}</Body>
      {button(-1)}
      <Text style={[styles.stepValue, { color: theme.text }]}>{value}</Text>
      {button(1)}
    </View>
  );
}

// Picks several fry from a spawn in one go: each becomes a fish with the spawn's parents, birth date, strain and
// generation, and gets its own ID. Details for single fish can be edited afterwards.
export default function PickManyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useFocusData(async () => {
    const [spawn, events, fish, tanks] = await Promise.all([getSpawn(id), listSpawnEvents([id]), listFish(), listTanks()]);
    return { spawn, events, fish, tanks };
  });
  const [males, setMales] = useState(0);
  const [females, setFemales] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [tail, setTail] = useState<TailStandard | null>(null);
  const [status, setStatus] = useState<FishStatus>('show_prospect');
  const [tankId, setTankId] = useState<string | null | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const total = males + females + unknown;
  const { allowLeave } = useUnsavedChanges(total > 0 && !busy);

  if (!data && !error) return <Loading />;
  if (!data?.spawn) return <Screen><ErrorText message={error ?? 'Spawn not found.'} /></Screen>;
  const spawn = data.spawn;
  const picks = data.fish.filter((f) => f.spawn_id === spawn.id);
  const remaining = summarizeBatch(spawn, data.events, picks).remaining;
  const sire = data.fish.find((f) => f.id === spawn.sire_id);
  const chosenTail = tail ?? sire?.tail_standard ?? null;
  const chosenTank = tankId === undefined ? spawn.tank_id : tankId;
  const room = (current: number) => current + Math.max(0, remaining - total);

  async function save() {
    if (!chosenTail) {
      setSaveError('Pick the tail standard.');
      return;
    }
    setBusy(true);
    setSaveError(null);
    const sexes: Sex[] = [
      ...Array<Sex>(males).fill('M'),
      ...Array<Sex>(females).fill('F'),
      ...Array<Sex>(unknown).fill('U'),
    ];
    let saved = 0;
    try {
      // One at a time, so each fish gets the next ID in order.
      for (const sex of sexes) {
        await createFish({
          name: null,
          sex,
          tail_standard: chosenTail,
          base_colour: sire?.base_colour ?? null,
          cover_colours: sire?.cover_colours ?? [],
          strain: spawn.strain,
          date_of_birth: spawn.born_on,
          generation: spawn.generation,
          origin: 'bred',
          foundation: false,
          original_breeder: null,
          sire_id: spawn.sire_id,
          dam_id: spawn.dam_id,
          tank_id: chosenTank,
          status,
          notes: null,
          spawn_id: spawn.id,
          pick_reason: reason.trim() || null,
        });
        saved++;
      }
      allowLeave();
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setSaveError(saved > 0 ? `Saved ${saved} of ${sexes.length} fish, then failed: ${message}` : message);
      // Count down what was saved so tapping Save again only adds the rest.
      let left = saved;
      const take = (n: number) => {
        const used = Math.min(n, left);
        left -= used;
        return n - used;
      };
      setMales(take(males));
      setFemales(take(females));
      setUnknown(take(unknown));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Body style={styles.bigNumber}>{remaining}</Body>
        <Muted>fry left in {spawn.spawn_code} to pick from</Muted>
      </Card>

      <Card>
        <Stepper label="Males" value={males} onChange={setMales} max={room(males)} />
        <Stepper label="Females" value={females} onChange={setFemales} max={room(females)} />
        <Stepper label="Unknown sex" value={unknown} onChange={setUnknown} max={room(unknown)} />
      </Card>

      <ChipSelect label="Tail standard" options={TAIL_STANDARDS} value={chosenTail} onChange={setTail} />
      <ChipSelect label="Status" options={PICK_STATUSES} value={status} onChange={(v) => v && setStatus(v)} />
      <ChipSelect
        label="Tank"
        options={data.tanks.map((t) => ({ value: t.id, label: t.name ? `${t.tank_code} · ${t.name}` : t.tank_code }))}
        value={chosenTank}
        onChange={setTankId}
        allowClear
      />
      <Field label="Why picked (optional)" value={reason} onChangeText={setReason} placeholder="e.g. big dorsal, even colour" />
      <Muted>
        Every fish gets the parents, date of birth, strain and generation from the spawn. You can edit any one of them
        afterwards.
      </Muted>
      <ErrorText message={saveError} />
      <Button
        title={total === 0 ? 'Choose how many to pick' : `Save ${total} picked fish`}
        icon={Icons.fish}
        onPress={save}
        busy={busy}
        disabled={total === 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigNumber: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepLabel: { flex: 1 },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 32, textAlign: 'center', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
