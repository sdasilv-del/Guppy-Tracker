import { router } from 'expo-router';

import { Button, Empty, ErrorText, ListRow, Loading, Muted, Screen, Section } from '@/components/ui';
import { listFish, listSpawnEvents, listSpawns } from '@/lib/db';
import { formatAge, formatDate } from '@/lib/format';
import { summarizeBatch } from '@/lib/spawn';
import type { Fish, Spawn } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';

export default function SpawnsScreen() {
  const { data, error } = useFocusData(async () => {
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

  const row = ({ spawn: s, batch }: { spawn: Spawn; batch: ReturnType<typeof summarizeBatch> }) => (
    <ListRow
      key={s.id}
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
    <Screen>
      <Button title="Record a spawn" onPress={() => router.push('/spawns/new')} />
      <ErrorText message={error} />
      <Section title={`Growing out (${growing.length})`}>
        {growing.length === 0 ? <Empty>No fry batches growing out. Record a spawn from a breeding group.</Empty> : null}
        {growing.map(row)}
      </Section>
      {done.length > 0 ? (
        <Section title={`Finished (${done.length})`}>
          <Muted>Every fry has been picked, culled or lost.</Muted>
          {done.map(row)}
        </Section>
      ) : null}
    </Screen>
  );
}
