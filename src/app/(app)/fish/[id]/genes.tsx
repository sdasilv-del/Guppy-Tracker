import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, ChipSelect, Empty, ErrorText, Field, Heading, Loading, Muted, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { createGene, deleteGene, getFish, listFish, listFishGenes, listGenes, setFishGene } from '@/lib/db';
import { copyOptions, GENE_MODES, GENE_PRESETS, type GeneMode, inferredCarrier } from '@/lib/genetics';
import { useFocusData } from '@/lib/use-data';

// The colour genes of one fish, plus the list of genes the breeder tracks.
export default function FishGenesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useFocusData(async () => {
    const [fish, allFish, genes, records] = await Promise.all([getFish(id), listFish(), listGenes(), listFishGenes()]);
    return { fish, allFish, genes, records };
  });
  const [name, setName] = useState('');
  const [mode, setMode] = useState<GeneMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!data && !error) return <Loading />;
  if (!data?.fish) return <Screen><ErrorText message={error ?? 'Fish not found.'} /></Screen>;
  const fish = data.fish;
  const copiesOf = (fishId: string, geneId: string) =>
    data.records.find((r) => r.fish_id === fishId && r.gene_id === geneId)?.copies;

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setSaveError(null);
    try {
      await work();
      await reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  function addGene(geneName: string, geneMode: GeneMode) {
    if (!geneName.trim()) return;
    void run(async () => {
      await createGene(geneName, geneMode);
      setName('');
      setMode(null);
    });
  }

  function confirmRemove(geneId: string, geneName: string) {
    Alert.alert(`Stop tracking ${geneName}?`, 'This removes it from every fish.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(() => deleteGene(geneId)) },
    ]);
  }

  const unused = GENE_PRESETS.filter((p) => !data.genes.some((g) => g.name.toLowerCase() === p.name.toLowerCase()));

  return (
    <Screen>
      <Stack.Screen options={{ title: `${fish.fish_code} genes` }} />
      <Muted>Record what you know. Leave a gene blank if you&apos;re not sure; predictions need both parents recorded.</Muted>
      <ErrorText message={saveError} />
      {data.genes.length === 0 ? <Empty>No genes tracked yet. Add one below.</Empty> : null}
      {data.genes.map((g) => {
        const options = copyOptions(g.mode, fish.sex);
        const value = copiesOf(fish.id, g.id) ?? null;
        const hint =
          value === null && inferredCarrier(fish, g, (fid) => copiesOf(fid, g.id))
            ? 'A parent shows it, so this fish carries at least one copy.'
            : null;
        return (
          <Card key={g.id}>
            <View style={styles.geneHeader}>
              <Heading>{g.name}</Heading>
              <Muted>{GENE_MODES.find((m) => m.value === g.mode)?.label}</Muted>
            </View>
            {options.length === 0 ? (
              <Muted>Females don&apos;t carry Y genes.</Muted>
            ) : (
              <ChipSelect
                label="This fish"
                options={options}
                value={value}
                onChange={(v) => run(() => setFishGene(fish.id, g.id, v))}
                allowClear
              />
            )}
            {hint ? <Muted>{hint}</Muted> : null}
            <Button title={`Stop tracking ${g.name}`} variant="secondary" small onPress={() => confirmRemove(g.id, g.name)} />
          </Card>
        );
      })}

      <Section title="Track another gene">
        {unused.length > 0 ? (
          <View style={styles.presets}>
            {unused.map((p) => (
              <Button
                key={p.name}
                title={`${p.name} (${GENE_MODES.find((m) => m.value === p.mode)?.label.toLowerCase()})`}
                variant="secondary"
                small
                onPress={() => addGene(p.name, p.mode)}
                disabled={busy}
              />
            ))}
          </View>
        ) : null}
        <Field label="Gene name" value={name} onChangeText={setName} placeholder="e.g. Moscow, Metal, Asian blau" />
        <ChipSelect label="How it's passed on" options={GENE_MODES} value={mode} onChange={setMode} />
        {mode ? <Muted>{GENE_MODES.find((m) => m.value === mode)?.help}</Muted> : null}
        <Button title="Add gene" onPress={() => mode && addGene(name, mode)} disabled={!name.trim() || !mode} busy={busy} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  geneHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
