import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Empty, ErrorText, Heading, ListRow, ListScreen, Loading, Muted } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
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
  const { data, error, reload } = useFocusData(async () => {
    const [groups, members, fish] = await Promise.all([listGroups(), groupMembers(), listFish()]);
    return { groups, members, fishById: Object.fromEntries(fish.map((f) => [f.id, f])) };
  });

  if (!data && !error) return <Loading />;

  const active = data?.groups.filter((g) => !g.ended_on) ?? [];
  const ended = data?.groups.filter((g) => g.ended_on) ?? [];
  // Headings and groups in one list, so only the rows on screen are drawn.
  const items: ('active' | 'ended' | BreedingGroup)[] = [
    'active',
    ...active,
    ...(ended.length > 0 ? (['ended'] as const) : []),
    ...ended,
  ];
  const row = (g: BreedingGroup) => {
    const members = (data?.members[g.id] ?? []).map((id) => data!.fishById[id]).filter(Boolean);
    return (
      <ListRow
        icon={Icons.group}
        title={g.name ? `${g.group_code} · ${g.name}` : g.group_code}
        subtitle={groupSubtitle(g, members)}
        onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}
      />
    );
  };

  return (
    <ListScreen
      header={
        <>
          <Button title="Start a breeding group" icon={Icons.group} onPress={() => router.push('/groups/new')} />
          <ErrorText message={error} />
        </>
      }
      data={items}
      keyExtractor={(i) => (typeof i === 'string' ? i : i.id)}
      onRefresh={reload}
      renderItem={({ item }) =>
        item === 'active' ? (
          <View style={styles.heading}>
            <Heading>{`Active (${active.length})`}</Heading>
            {active.length === 0 ? (
              <Empty>No active groups. Put a pair, trio or larger group together to start breeding.</Empty>
            ) : null}
          </View>
        ) : item === 'ended' ? (
          <View style={styles.heading}>
            <Heading>{`Ended (${ended.length})`}</Heading>
            <Muted>Groups that have ended. Their spawns are kept.</Muted>
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
