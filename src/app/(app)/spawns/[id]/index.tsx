import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { tankLabel } from '@/components/group-form';
import { Body, Button, Card, Empty, ErrorText, InfoRow, ListRow, Loading, Muted, Screen, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { FISH_STATUSES, labelOf, SEXES, SPAWN_EVENT_KINDS, type SpawnEventKind } from '@/lib/constants';
import { getGroup, getSpawn, listFish, listPicks, listSpawnEvents, listTanks } from '@/lib/db';
import { formatAge, formatDate } from '@/lib/format';
import { eventSummary, summarizeBatch } from '@/lib/spawn';
import { useFocusData } from '@/lib/use-data';

export default function SpawnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useFocusData(async () => {
    const spawn = await getSpawn(id);
    const [group, events, picks, fish, tanks] = await Promise.all([
      spawn?.group_id ? getGroup(spawn.group_id) : null,
      listSpawnEvents([id]),
      listPicks(id),
      listFish(),
      listTanks(),
    ]);
    return { spawn, group, events, picks, fish, tanks };
  });

  if (!data && !error) return <Loading />;
  const spawn = data?.spawn;
  if (!data || !spawn) {
    return (
      <Screen>
        <ErrorText message={error ?? 'This spawn was not found in your account.'} />
      </Screen>
    );
  }

  const byId = Object.fromEntries(data.fish.map((f) => [f.id, f]));
  const tankNames = Object.fromEntries(data.tanks.map((t) => [t.id, tankLabel(t)]));
  const batch = summarizeBatch(spawn, data.events, data.picks);
  const sire = spawn.sire_id ? byId[spawn.sire_id] : null;
  const dam = spawn.dam_id ? byId[spawn.dam_id] : null;
  const openFish = (fid: string) => router.push({ pathname: '/fish/[id]', params: { id: fid } });
  const logEvent = (kind: SpawnEventKind) =>
    router.push({ pathname: '/spawns/[id]/event', params: { id, kind } });
  const log = [...data.events].reverse();

  return (
    <Screen>
      <Stack.Screen options={{ title: spawn.spawn_code }} />

      <Card style={styles.batch}>
        <Body style={styles.bigNumber}>{batch.remaining}</Body>
        <Muted>fry in the batch now, of {spawn.fry_count} born</Muted>
        <Muted>
          {batch.picked} picked · {batch.culled} culled · {batch.lost} lost
        </Muted>
        {batch.sexing ? (
          <Muted>
            Sexed {formatDate(batch.sexing.happened_on)}: {batch.sexing.males ?? 0} M · {batch.sexing.females ?? 0} F ·{' '}
            {batch.sexing.unknown ?? 0} unknown
          </Muted>
        ) : null}
      </Card>

      <Button
        title="Pick fish from this spawn"
        onPress={() => router.push({ pathname: '/spawns/[id]/pick', params: { id } })}
      />
      <View style={styles.grid}>
        {SPAWN_EVENT_KINDS.map((k) => (
          <View key={k.value} style={styles.quarter}>
            <Button title={k.label} variant="secondary" small onPress={() => logEvent(k.value)} />
          </View>
        ))}
      </View>

      <Card>
        <InfoRow
          label="Group"
          value={
            data.group ? (
              <Body
                style={styles.link}
                onPress={() => router.push({ pathname: '/groups/[id]', params: { id: data.group!.id } })}>
                {data.group.name ? `${data.group.group_code} ${data.group.name}` : data.group.group_code}
              </Body>
            ) : (
              'None'
            )
          }
        />
        <InfoRow
          label="Sire"
          value={sire ? <Body style={styles.link} onPress={() => openFish(sire.id)}>{sire.fish_code}</Body> : 'Unknown'}
        />
        <InfoRow
          label="Dam"
          value={dam ? <Body style={styles.link} onPress={() => openFish(dam.id)}>{dam.fish_code}</Body> : 'Unknown'}
        />
        <InfoRow label="Born" value={`${formatDate(spawn.born_on)} (${formatAge(spawn.born_on) || 'new'})`} />
        <InfoRow label="Tank" value={spawn.tank_id ? tankNames[spawn.tank_id] : 'None'} />
        <InfoRow label="Strain" value={spawn.strain} />
        <InfoRow label="Generation" value={spawn.generation} />
        {spawn.notes ? <Muted>{spawn.notes}</Muted> : null}
      </Card>
      <Button
        title="Edit spawn"
        variant="secondary"
        small
        onPress={() => router.push({ pathname: '/spawns/[id]/edit', params: { id } })}
      />

      <Section title={`Picks (${data.picks.length})`}>
        {data.picks.length === 0 ? <Empty>No fish picked yet. Picked fry become fish with their own ID.</Empty> : null}
        {data.picks.map((f) => (
          <ListRow
            icon={Icons.fish}
            key={f.id}
            title={`${f.fish_code} · ${labelOf(SEXES, f.sex)}`}
            subtitle={[f.pick_reason, labelOf(FISH_STATUSES, f.status)].filter(Boolean).join(' · ')}
            onPress={() => openFish(f.id)}
          />
        ))}
      </Section>

      <Section title="Batch log">
        {log.length === 0 ? <Empty>Nothing logged yet. Moves, losses, sexing and culls show here.</Empty> : null}
        {log.map((e) => (
          <ListRow
            key={e.id}
            title={`${formatDate(e.happened_on)} · ${labelOf(SPAWN_EVENT_KINDS, e.kind)}`}
            subtitle={[eventSummary(e, tankNames), e.notes].filter(Boolean).join(' · ')}
            onPress={() =>
              router.push({ pathname: '/spawns/[id]/event', params: { id, kind: e.kind, eventId: e.id } })
            }
          />
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  batch: { alignItems: 'center', gap: 2 },
  bigNumber: { fontSize: 40, lineHeight: 46, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: Spacing.two },
  quarter: { flex: 1 },
  link: { textDecorationLine: 'underline', fontWeight: '500' },
});
