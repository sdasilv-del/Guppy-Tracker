import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Empty, ListRow, LoadError, Loading, Screen, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { groupMembers, listFish, listGroups, listSpawnEvents, listSpawns } from '@/lib/db';
import { formatAge, formatDate } from '@/lib/format';
import { summarizeBatch } from '@/lib/spawn';
import { listStrains } from '@/lib/strains';
import { useFocusData } from '@/lib/use-data';

// Breeding tab: the groups that are breeding now and the fry batches still growing out.
export default function BreedingScreen() {
  const { data, error, reload } = useFocusData(async () => {
    const [groups, members, spawns, events, fish] = await Promise.all([
      listGroups(),
      groupMembers(),
      listSpawns(),
      listSpawnEvents(),
      listFish(),
    ]);
    return { groups, members, spawns, events, fish };
  });

  if (!data && !error) return <Loading />;

  const fishById = Object.fromEntries((data?.fish ?? []).map((f) => [f.id, f]));
  const activeGroups = (data?.groups ?? []).filter((g) => !g.ended_on);
  const growing = (data?.spawns ?? [])
    .map((s) => ({ spawn: s, batch: summarizeBatch(s, data!.events, data!.fish) }))
    .filter((x) => x.batch.remaining > 0);
  const strains = listStrains(data?.fish ?? []);
  const code = (id: string | null) => (id ? fishById[id]?.fish_code ?? '?' : 'Unknown');

  return (
    <Screen>
      {error ? <LoadError message={`Couldn't load breeding. ${error}`} onRetry={reload} /> : null}

      <Section title={`Breeding groups (${activeGroups.length})`}>
        {activeGroups.length === 0 ? (
          <Empty>No active groups. Put a pair, trio or larger group together to start breeding.</Empty>
        ) : null}
        {activeGroups.map((g) => {
          const members = (data?.members[g.id] ?? []).map((id) => fishById[id]).filter(Boolean);
          const males = members.filter((f) => f.sex === 'M').length;
          const females = members.filter((f) => f.sex === 'F').length;
          return (
            <ListRow
            icon={Icons.group}
              key={g.id}
              title={g.name ? `${g.group_code} · ${g.name}` : g.group_code}
              subtitle={[`${males}M ${females}F`, g.goal, `Since ${formatDate(g.started_on)}`].filter(Boolean).join(' · ')}
              onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}
            />
          );
        })}
        <View style={styles.actions}>
          <Button title="Start a group" icon={Icons.group} small onPress={() => router.push('/groups/new')} />
          <Button title="All groups" small variant="secondary" onPress={() => router.push('/groups')} />
          <Button title="Trial pairing" small variant="secondary" onPress={() => router.push('/groups/pair')} />
          <Button title="Line planner" small variant="secondary" onPress={() => router.push('/plans')} />
        </View>
      </Section>

      <Section title={`Fry growing out (${growing.length})`}>
        {growing.length === 0 ? <Empty>No fry batches growing out. Record a spawn from a breeding group.</Empty> : null}
        {growing.map(({ spawn: s, batch }) => (
          <ListRow
            icon={Icons.spawn}
            key={s.id}
            title={`${s.spawn_code} · ${code(s.sire_id)} × ${code(s.dam_id)}`}
            subtitle={`Born ${formatDate(s.born_on)} (${formatAge(s.born_on) || 'new'}) · ${batch.remaining} of ${
              s.fry_count
            } fry · ${batch.picked} picked`}
            onPress={() => router.push({ pathname: '/spawns/[id]', params: { id: s.id } })}
          />
        ))}
        <View style={styles.actions}>
          <Button title="Record a spawn" icon={Icons.spawn} small onPress={() => router.push('/spawns/new')} />
          <Button title="All spawns" small variant="secondary" onPress={() => router.push('/spawns')} />
          <Button title="Results" small variant="secondary" onPress={() => router.push('/spawns/results')} />
        </View>
      </Section>

      <Section title={`Strains (${strains.length})`}>
        {strains.length === 0 ? (
          <Empty>No strains yet. Give your fish a strain name to see how each line does generation by generation.</Empty>
        ) : null}
        {strains.map((st) => (
          <ListRow
            key={st.name}
            icon={Icons.strain}
            title={st.name}
            subtitle={`${st.generations.join(', ')} · ${st.active} of ${st.fish} fish in the fish room`}
            onPress={() => router.push({ pathname: '/strains/[name]', params: { name: st.name } })}
          />
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
