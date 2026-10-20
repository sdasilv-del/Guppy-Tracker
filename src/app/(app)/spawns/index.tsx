import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LineSpawn } from '@/components/line-icons';
import { Button, Empty, ErrorText, Heading, ListRow, ListScreen, Loading, Muted } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { listFish, listSpawnEvents, listSpawns } from '@/lib/db';
import { formatAge, formatDate } from '@/lib/format';
import { summarizeBatch } from '@/lib/spawn';
import type { Fish, Spawn } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';

export default function SpawnsScreen() {
  const { data, error, reload } = useFocusData(async () => {
    const [spawns, events, fish] = await Promise.all([listSpawns(), listSpawnEvents(), listFish()]);
    return { spawns, events, fish };
  });

  if (!data && !error) return <Loading />;

  const withBatch = (data?.spawns ?? []).map((s) => ({
    spawn: s,
    batch: summarizeBatch(s, data!.events, data!.fish),
  }));
  const growing = withBatch.filter((x) => x.batch.remaining > 0);
  const done = withBatch.filter((x) => x.batch.remaining === 0);
  const codes = Object.fromEntries((data?.fish ?? []).map((f: Fish) => [f.id, f.fish_code]));

  type Item =
    | { key: string; heading: string; note?: string }
    | { key: string; spawn: Spawn; batch: ReturnType<typeof summarizeBatch> };
  const items: Item[] = [
    { key: 'growing', heading: `Growing out (${growing.length})`, note: growing.length === 0 ? 'none' : undefined },
    ...growing.map((x) => ({ key: x.spawn.id, ...x })),
    ...(done.length > 0
      ? [
          { key: 'done', heading: `Finished (${done.length})`, note: 'Every fry has been picked, culled or lost.' },
          ...done.map((x) => ({ key: x.spawn.id, ...x })),
        ]
      : []),
  ];

  const row = ({ spawn: s, batch }: { spawn: Spawn; batch: ReturnType<typeof summarizeBatch> }) => (
    <ListRow
      icon={<LineSpawn />}
      title={`${s.spawn_code} · ${s.sire_id ? codes[s.sire_id] ?? '?' : 'Unknown'} × ${
        s.dam_id ? codes[s.dam_id] ?? '?' : 'Unknown'
      }`}
      subtitle={`Born ${formatDate(s.born_on)} (${formatAge(s.born_on) || 'new'}) · ${batch.remaining} of ${
        s.fry_count
      } fry · ${batch.picked} picked`}
      onPress={() => router.push({ pathname: '/spawns/[id]', params: { id: s.id } })}
    />
  );

  return (
    <ListScreen
      header={
        <>
          <Button title="Record a spawn" icon={Icons.spawn} onPress={() => router.push('/spawns/new')} />
          <Button title="Spawn results" icon={Icons.strain} variant="secondary" small onPress={() => router.push('/spawns/results')} />
          <ErrorText message={error} />
        </>
      }
      data={items}
      keyExtractor={(i) => i.key}
      onRefresh={reload}
      renderItem={({ item }) =>
        'heading' in item ? (
          <View style={styles.heading}>
            <Heading>{item.heading}</Heading>
            {item.note === 'none' ? (
              <Empty art={<LineSpawn size={44} />}>No fry batches growing out. Record a spawn from a breeding group.</Empty>
            ) : item.note ? (
              <Muted>{item.note}</Muted>
            ) : null}
          </View>
        ) : (
          row(item)
        )
      }
    />
  );
}

// A heading between groups of hairline rows, with room above it.
const styles = StyleSheet.create({
  heading: { gap: Spacing.two, paddingTop: Spacing.three, paddingBottom: Spacing.two },
});
