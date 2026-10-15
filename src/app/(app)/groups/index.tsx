import { router } from 'expo-router';

import { Button, Empty, ErrorText, ListRow, Loading, Muted, Screen, Section } from '@/components/ui';
import { groupMembers, listFish, listGroups } from '@/lib/db';
import { formatDate } from '@/lib/format';
import type { BreedingGroup, Fish } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';

function groupSubtitle(g: BreedingGroup, members: Fish[]): string {
  const males = members.filter((f) => f.sex === 'M').length;
  const females = members.filter((f) => f.sex === 'F').length;
  return [
    `${males}M ${females}F`,
    g.goal,
    g.ended_on ? `Ended ${formatDate(g.ended_on)}` : `Since ${formatDate(g.started_on)}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function GroupsScreen() {
  const { data, error } = useFocusData(async () => {
    const [groups, members, fish] = await Promise.all([listGroups(), groupMembers(), listFish()]);
    return { groups, members, fishById: Object.fromEntries(fish.map((f) => [f.id, f])) };
  });

  if (!data && !error) return <Loading />;

  const active = data?.groups.filter((g) => !g.ended_on) ?? [];
  const ended = data?.groups.filter((g) => g.ended_on) ?? [];
  const row = (g: BreedingGroup) => {
    const members = (data?.members[g.id] ?? []).map((id) => data!.fishById[id]).filter(Boolean);
    return (
      <ListRow
        key={g.id}
        title={g.name ? `${g.group_code} · ${g.name}` : g.group_code}
        subtitle={groupSubtitle(g, members)}
        onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}
      />
    );
  };

  return (
    <Screen>
      <Button title="Start a breeding group" onPress={() => router.push('/groups/new')} />
      <ErrorText message={error} />
      <Section title={`Active (${active.length})`}>
        {active.length === 0 ? (
          <Empty>No active groups. Put a pair, trio or larger group together to start breeding.</Empty>
        ) : null}
        {active.map(row)}
      </Section>
      {ended.length > 0 ? (
        <Section title={`Ended (${ended.length})`}>
          <Muted>Groups that have ended. Their spawns are kept.</Muted>
          {ended.map(row)}
        </Section>
      ) : null}
    </Screen>
  );
}
