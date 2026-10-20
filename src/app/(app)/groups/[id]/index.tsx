import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { tankLabel } from '@/components/group-form';
import { Body, Button, Card, Empty, ErrorText, InfoRow, ListRow, Loading, Muted, Screen, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { FISH_STATUSES, labelOf, SEXES } from '@/lib/constants';
import {
  getGroup,
  groupMembers,
  groupTraitIds,
  listFish,
  listSpawnEvents,
  listSpawns,
  listTanks,
  listTraits,
  listTraitsForFish,
  updateGroup,
} from '@/lib/db';
import { formatDate, todayISO } from '@/lib/format';
import { closeRelations, formatInbreeding, makeKinship } from '@/lib/kinship';
import { summarizeBatch } from '@/lib/spawn';
import { useFocusData } from '@/lib/use-data';

const SEX_ORDER = { M: 0, F: 1, U: 2 };

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = useFocusData(async () => {
    const [group, members, traitIds, fish, tanks, traits, allSpawns] = await Promise.all([
      getGroup(id),
      groupMembers([id]),
      groupTraitIds(id),
      listFish(),
      listTanks(),
      listTraits(),
      listSpawns(),
    ]);
    const spawns = allSpawns.filter((s) => s.group_id === id);
    const memberIds = members[id] ?? [];
    const [events, traitRecords] = await Promise.all([
      listSpawnEvents(spawns.map((s) => s.id)),
      listTraitsForFish(memberIds),
    ]);
    return { group, memberIds, traitIds, fish, tanks, traits, spawns, events, traitRecords };
  });

  if (!data && !error) return <Loading />;
  const group = data?.group;
  if (!data || !group) {
    return (
      <Screen>
        <ErrorText message={error ?? 'This group was not found in your account.'} />
      </Screen>
    );
  }

  const byId = Object.fromEntries(data.fish.map((f) => [f.id, f]));
  const members = data.memberIds
    .map((fid) => byId[fid])
    .filter(Boolean)
    .sort((a, b) => SEX_ORDER[a.sex] - SEX_ORDER[b.sex] || a.fish_code.localeCompare(b.fish_code));
  const tank = data.tanks.find((t) => t.id === group.tank_id);
  const traitNames = data.traits.filter((t) => data.traitIds.includes(t.id)).map((t) => t.name);
  const relations = closeRelations(members);
  // Expected inbreeding of fry from each male and female in the group, highest first.
  const kin = makeKinship(data.fish);
  const pairs = members
    .filter((m) => m.sex === 'M')
    .flatMap((m) =>
      members.filter((f) => f.sex === 'F').map((f) => ({ m, f, value: kin.offspringInbreeding(m.id, f.id) })),
    )
    .sort((a, b) => b.value - a.value);
  // Each member's latest record for each target trait, so the group can be judged against its goal.
  const targetSummary = (fishId: string) =>
    data.traitIds
      .map((tid) => {
        const latest = data.traitRecords.find((r) => r.fish_id === fishId && r.trait_id === tid);
        if (!latest) return null;
        const name = data.traits.find((t) => t.id === tid)?.name;
        return `${name}: ${[latest.value, latest.score !== null ? latest.score : null].filter((v) => v !== null).join(' ')}`;
      })
      .filter(Boolean)
      .join(' · ');
  const code = (fid: string | null) => (fid ? byId[fid]?.fish_code ?? '?' : 'Unknown');

  async function setEnded(endedOn: string | null) {
    setBusy(true);
    setActionError(null);
    try {
      await updateGroup(id, { ended_on: endedOn });
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: group.group_code }} />

      <Card>
        <InfoRow label="Name" value={group.name} />
        <InfoRow label="Tank" value={tank ? tankLabel(tank) : 'None'} />
        <InfoRow label="Started" value={formatDate(group.started_on)} />
        <InfoRow label="Ended" value={group.ended_on ? formatDate(group.ended_on) : 'Still together'} />
        <InfoRow label="Target traits" value={traitNames.join(', ')} />
        {group.goal ? (
          <View style={styles.block}>
            <Muted>Goal</Muted>
            <Body>{group.goal}</Body>
          </View>
        ) : null}
        {group.notes ? <Muted>{group.notes}</Muted> : null}
      </Card>

      <ErrorText message={actionError} />
      <View style={styles.buttons}>
        <View style={styles.half}>
          <Button
            title="Edit"
            icon={Icons.edit}
            variant="secondary"
            small
            onPress={() => router.push({ pathname: '/groups/[id]/edit', params: { id } })}
          />
        </View>
        <View style={styles.half}>
          {group.ended_on ? (
            <Button title="Reopen group" variant="secondary" small busy={busy} onPress={() => setEnded(null)} />
          ) : (
            <Button title="End group" variant="secondary" small busy={busy} onPress={() => setEnded(todayISO())} />
          )}
        </View>
      </View>

      <Section title={`Fish (${members.length})`}>
        {relations.length > 0 ? (
          <Card>
            <Body style={styles.warning}>Related fish in this group</Body>
            {relations.map((r) => (
              <Muted key={r}>{r}</Muted>
            ))}
          </Card>
        ) : null}
        {pairs.length > 0 ? (
          <Card>
            <Body>Fry inbreeding</Body>
            {pairs.slice(0, 6).map(({ m, f, value }) => (
              <Muted key={`${m.id}-${f.id}`}>{`${m.fish_code} × ${f.fish_code}: ${formatInbreeding(value)}`}</Muted>
            ))}
            {pairs.length > 6 ? <Muted>{`and ${pairs.length - 6} more pairs`}</Muted> : null}
            <Muted>From recorded parents only. 25% is a brother-sister cross, 12.5% half siblings.</Muted>
          </Card>
        ) : null}
        {members.length === 0 ? <Empty>No fish in this group.</Empty> : null}
        {members.map((f) => (
          <ListRow
            icon={Icons.fish}
            key={f.id}
            title={`${f.fish_code} · ${labelOf(SEXES, f.sex)}`}
            subtitle={[
              f.strain,
              f.generation,
              `Sire ${code(f.sire_id)} · Dam ${code(f.dam_id)}`,
              labelOf(FISH_STATUSES, f.status),
              targetSummary(f.id),
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => router.push({ pathname: '/fish/[id]', params: { id: f.id } })}
          />
        ))}
      </Section>

      <Section
        title={`Spawns (${data.spawns.length})`}
        action={
          <Button
            title="Record spawn"
            small
            onPress={() => router.push({ pathname: '/spawns/new', params: { groupId: id } })}
          />
        }>
        {data.spawns.length === 0 ? <Empty>No spawns recorded from this group yet.</Empty> : null}
        {data.spawns.map((s) => {
          const batch = summarizeBatch(s, data.events, data.fish);
          return (
            <ListRow
            icon={Icons.spawn}
              key={s.id}
              title={`${s.spawn_code} · born ${formatDate(s.born_on)}`}
              subtitle={`${s.fry_count} fry at birth · ${batch.remaining} now · ${batch.picked} picked · Dam ${code(s.dam_id)}`}
              onPress={() => router.push({ pathname: '/spawns/[id]', params: { id: s.id } })}
            />
          );
        })}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  block: { gap: 2, paddingTop: Spacing.one },
  warning: { fontWeight: '600' },
});
