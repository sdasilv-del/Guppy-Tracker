import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Choice } from '@/components/fish-choice';
import { Body, Button, Card, ChipSelect, ErrorText, Field, Loading, Muted, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { attempt } from '@/lib/alerts';
import { INACTIVE_STATUSES } from '@/lib/constants';
import { deleteLinePlan, getLinePlan, listFish, saveLinePlan } from '@/lib/db';
import { blankToNull } from '@/lib/format';
import { formatInbreeding, inbreedingMeaning } from '@/lib/kinship';
import { planGenerations, type PlanStep, type Scheme, SCHEMES, TIGHT, VERY_TIGHT } from '@/lib/line-plan';
import type { Fish } from '@/lib/types';

const MAX_GENERATIONS = 6;

export default function LinePlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const theme = useTheme();
  const [fish, setFish] = useState<Fish[] | null>(null);
  const [name, setName] = useState('');
  const [sireId, setSireId] = useState<string | null>(null);
  const [damId, setDamId] = useState<string | null>(null);
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listFish(), isNew ? null : getLinePlan(id)])
      .then(([all, plan]) => {
        setFish(all);
        if (plan) {
          setName(plan.name);
          setSireId(plan.sire_id);
          setDamId(plan.dam_id);
          setSteps(plan.steps);
          setNotes(plan.notes ?? '');
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id, isNew]);

  if (!fish) return error ? <Screen><ErrorText message={error} /></Screen> : <Loading />;

  const active = fish.filter((f) => !INACTIVE_STATUSES.includes(f.status));
  const sire = fish.find((f) => f.id === sireId);
  const dam = fish.find((f) => f.id === damId);
  const generations = sire && dam ? planGenerations(fish, sire.id, dam.id, steps) : [];
  const outcrossOptions = active
    .filter((f) => f.sex === 'M' || f.sex === 'F')
    .map((f) => ({ value: f.id, label: `${f.fish_code} ${f.sex === 'M' ? '♂' : '♀'}` }));

  const setStep = (i: number, patch: Partial<PlanStep>) =>
    setSteps(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  async function save() {
    if (!name.trim()) {
      setError('Give the plan a name.');
      return;
    }
    if (steps.some((s) => s.scheme === 'outcross' && !s.outcross_id)) {
      setError('Choose the fish for each outcross.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveLinePlan(isNew ? null : id, { name: name.trim(), sire_id: sireId, dam_id: damId, steps, notes: blankToNull(notes) });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this plan?', 'No fish are changed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => attempt(() => deleteLinePlan(id), () => router.back()) },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'New line plan' : name || 'Line plan' }} />
      <Field label="Plan name" value={name} onChangeText={setName} placeholder="e.g. Red triangle line 2027" />
      <Choice label="Starting male" fish={active.filter((f) => f.sex === 'M')} chosen={sire} onChoose={setSireId} />
      <Choice label="Starting female" fish={active.filter((f) => f.sex === 'F')} chosen={dam} onChoose={setDamId} />

      {generations.map((g, i) => {
        const step = steps[i];
        const level = g.inbreeding >= VERY_TIGHT ? 'very' : g.inbreeding >= TIGHT ? 'tight' : null;
        return (
          <View key={g.number} style={styles.generation}>
            <Card style={level ? { borderWidth: 1, borderColor: level === 'very' ? theme.danger : theme.accent } : undefined}>
              <View style={styles.genHeader}>
                <Text style={[styles.genTitle, { color: theme.text }]}>Generation {g.number}</Text>
                <Text style={[styles.genValue, { color: level === 'very' ? theme.danger : theme.text }]}>
                  {formatInbreeding(g.inbreeding)}
                </Text>
              </View>
              <Muted>{`Parents: ${g.parents}`}</Muted>
              <Body>{inbreedingMeaning(g.inbreeding)}</Body>
              {level === 'very' ? (
                <Body style={{ color: theme.danger, fontWeight: '600' }}>Very tight. Plan an outcross soon.</Body>
              ) : null}
            </Card>
            {step ? (
              <Card>
                <ChipSelect
                  label={`To breed generation ${g.number + 1}`}
                  options={SCHEMES}
                  value={step.scheme}
                  onChange={(v) => v && setStep(i, { scheme: v as Scheme, outcross_id: v === 'outcross' ? step.outcross_id : null })}
                />
                {step.scheme === 'outcross' ? (
                  <ChipSelect
                    label="Outcross to"
                    options={outcrossOptions}
                    value={step.outcross_id}
                    onChange={(v) => setStep(i, { outcross_id: v })}
                  />
                ) : null}
              </Card>
            ) : null}
          </View>
        );
      })}

      {sire && dam ? (
        <View style={styles.row}>
          {generations.length < MAX_GENERATIONS ? (
            <Button
              title="Add a generation"
              icon={Icons.add}
              variant="secondary"
              small
              onPress={() => setSteps([...steps, { scheme: 'siblings', outcross_id: null }])}
            />
          ) : null}
          {steps.length > 0 ? (
            <Button title="Remove last" variant="secondary" small onPress={() => setSteps(steps.slice(0, -1))} />
          ) : null}
        </View>
      ) : (
        <Muted>Choose the starting pair to see the plan.</Muted>
      )}
      {sire && dam ? (
        <Button
          title="Start a group with this pair"
          icon={Icons.group}
          variant="secondary"
          small
          onPress={() => router.push({ pathname: '/groups/new', params: { members: `${sire.id},${dam.id}` } })}
        />
      ) : null}

      <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="What you are breeding for" />
      <Muted>Figures count only recorded ancestors and assume the plan is followed. Nothing is changed on your fish.</Muted>
      <ErrorText message={error} />
      <Button title={isNew ? 'Save plan' : 'Save changes'} onPress={save} busy={busy} />
      {!isNew ? <Button title="Delete plan" variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  generation: { gap: Spacing.two },
  genHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  genTitle: { fontSize: 18, fontWeight: '700' },
  genValue: { fontSize: 22, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
