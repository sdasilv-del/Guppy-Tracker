import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Body, Card, Empty, Heading, Icon, InfoRow, ListRow, LoadError, Loading, Muted, Screen, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listBestScores, listFish } from '@/lib/db';
import { type GenerationStats, type ScoreStats, strainGenerations } from '@/lib/strains';
import { useFocusData } from '@/lib/use-data';

const score = (n: number | null) => (n === null ? '–' : n.toFixed(1));

function Trend({ now, before }: { now: number | null; before: number | null }) {
  const theme = useTheme();
  if (now === null || before === null) return null;
  const diff = now - before;
  if (Math.abs(diff) < 0.05) return <Muted>same as last generation</Muted>;
  const up = diff > 0;
  return (
    <View style={styles.trend}>
      <Icon
        name={up ? { ios: 'arrow.up.right', android: 'trending_up' } : { ios: 'arrow.down.right', android: 'trending_down' }}
        size={14}
        color={up ? theme.success : theme.danger}
      />
      <Muted>
        {up ? '+' : ''}
        {diff.toFixed(1)} on last generation
      </Muted>
    </View>
  );
}

function ScoreLine({ label, stats, previous }: { label: string; stats: ScoreStats; previous: ScoreStats | null }) {
  if (stats.count === 0) return <InfoRow label={label} value="Not judged yet" />;
  return (
    <View style={styles.scoreBlock}>
      <InfoRow
        label={`${label} (${stats.count} judged)`}
        value={`Avg ${score(stats.average)} · best ${score(stats.best?.total ?? null)}`}
      />
      <Trend now={stats.average} before={previous?.average ?? null} />
    </View>
  );
}

function GenerationCard({ gen, previous }: { gen: GenerationStats; previous: GenerationStats | null }) {
  const best = [gen.maleScores.best, gen.femaleScores.best]
    .filter((b): b is NonNullable<typeof b> => !!b)
    .sort((a, b) => b.total - a.total)[0];
  return (
    <Card>
      <View style={styles.genHeader}>
        <Heading>{gen.generation}</Heading>
        <Muted>
          {gen.fish.length} fish · {gen.males}M {gen.females}F{gen.unknown ? ` ${gen.unknown}?` : ''} · {gen.active} in the fish room
        </Muted>
      </View>
      <ScoreLine label="Males" stats={gen.maleScores} previous={previous?.maleScores ?? null} />
      <ScoreLine label="Females" stats={gen.femaleScores} previous={previous?.femaleScores ?? null} />
      {best ? (
        <ListRow
          icon={Icons.evaluation}
          title={`Top fish · ${best.fish.fish_code}`}
          subtitle={`IHS ${score(best.total)}`}
          onPress={() => router.push({ pathname: '/fish/[id]', params: { id: best.fish.id } })}
        />
      ) : null}
    </Card>
  );
}

// One strain, generation by generation, to show whether the line is improving.
export default function StrainScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { data, error, reload } = useFocusData(async () => {
    // One best score per fish, from the database, rather than every evaluation.
    const [fish, scores] = await Promise.all([listFish(), listBestScores()]);
    return strainGenerations(name, fish, scores);
  });

  if (!data && !error) return <Loading />;
  const gens = data ?? [];
  const total = gens.reduce((n, g) => n + g.fish.length, 0);

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: name }} />
      {error ? <LoadError message={`Couldn't load this strain. ${error}`} onRetry={reload} /> : null}
      <Card style={styles.summary}>
        <Body style={styles.bigNumber}>{gens.length}</Body>
        <Muted>
          generation{gens.length === 1 ? '' : 's'} · {total} fish
        </Muted>
      </Card>
      <Muted>{"IHS averages use each fish's best score. Arrows compare with the generation before."}</Muted>
      <Section title="By generation">
        {gens.length === 0 ? <Empty>No fish in this strain.</Empty> : null}
        {gens.map((g, i) => (
          <GenerationCard key={g.generation} gen={g} previous={i > 0 ? gens[i - 1] : null} />
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', gap: 0 },
  bigNumber: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  genHeader: { gap: Spacing.one },
  scoreBlock: { gap: 2 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, justifyContent: 'flex-end' },
});
