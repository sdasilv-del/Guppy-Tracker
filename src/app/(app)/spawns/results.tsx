import { router } from 'expo-router';
import { useState } from 'react';

import { LineSpawn } from '@/components/line-icons';
import { ChipSelect, Empty, ErrorText, ListRow, Loading, Muted, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { listFish, listSpawnEvents, listSpawns } from '@/lib/db';
import { formatDate, todayISO } from '@/lib/format';
import { groupResults, percent, spawnResult } from '@/lib/spawn';
import { useFocusData } from '@/lib/use-data';

const VIEWS = [
  { value: 'pair', label: 'By pair' },
  { value: 'strain', label: 'By strain' },
  { value: 'spawn', label: 'Each spawn' },
] as const;

type View = (typeof VIEWS)[number]['value'];

// Which pairs and strains give the most fry, the best survival and the most keepers.
export default function SpawnResultsScreen() {
  const [view, setView] = useState<View>('pair');
  const { data, error } = useFocusData(async () => {
    const [spawns, events, fish] = await Promise.all([listSpawns(), listSpawnEvents(), listFish()]);
    return { spawns, events, fish };
  });

  if (!data && !error) return <Loading />;
  if (!data) return <Screen><ErrorText message={error} /></Screen>;

  const today = todayISO();
  const codes = Object.fromEntries(data.fish.map((f) => [f.id, f.fish_code]));
  const code = (id: string | null) => (id ? codes[id] ?? '?' : 'Unknown');
  const rows = data.spawns.map((s) => ({ spawn: s, result: spawnResult(s, data.events, data.fish, today) }));
  const groups = groupResults(
    rows.map(({ spawn: s, result }) => ({
      key: view === 'pair' ? `${code(s.sire_id)} × ${code(s.dam_id)}` : s.strain?.trim() || 'No strain',
      result,
    })),
  );

  return (
    <Screen>
      <Muted>
        Survival counts the losses you log in each batch. Keepers are fry picked to become fish. Best producers are at the top.
      </Muted>
      <ChipSelect label="Show" options={VIEWS} value={view} onChange={(v) => v && setView(v)} />
      {rows.length === 0 ? <Empty art={<LineSpawn size={44} />}>No spawns yet. Results show here once you record spawns.</Empty> : null}
      {view === 'spawn'
        ? rows.map(({ spawn: s, result: r }) => (
            <ListRow
              key={s.id}
              icon={<LineSpawn />}
              title={`${s.spawn_code} · ${code(s.sire_id)} × ${code(s.dam_id)}`}
              subtitle={[
                `Born ${formatDate(s.born_on)}`,
                `${r.born} fry`,
                `4 wk ${percent(r.survival4)}`,
                `8 wk ${percent(r.survival8)}`,
                `${r.keepers} keepers`,
              ].join(' · ')}
              onPress={() => router.push({ pathname: '/spawns/[id]', params: { id: s.id } })}
            />
          ))
        : groups.map((g) => (
            <ListRow
              key={g.key}
              icon={view === 'pair' ? Icons.group : Icons.strain}
              title={g.key}
              subtitle={[
                `${g.spawns} ${g.spawns === 1 ? 'spawn' : 'spawns'}`,
                `${Math.round(g.averageFry)} fry on average`,
                `8 wk survival ${percent(g.survival8)}`,
                `${g.keepers} keepers (${g.keepersPerSpawn.toFixed(1)} a spawn)`,
              ].join(' · ')}
            />
          ))}
    </Screen>
  );
}
