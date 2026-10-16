import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Empty, ErrorText, InfoRow, ListRow, Loading, Muted, Screen, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { FISH_STATUSES, INACTIVE_STATUSES, labelOf, TANK_PURPOSES } from '@/lib/constants';
import {
  getTank,
  listFish,
  listFishInTank,
  listSpawnEvents,
  listSpawns,
  listWaterChanges,
  listWaterTests,
  spawnMovesIntoTank,
} from '@/lib/db';
import { summarizeBatch } from '@/lib/spawn';
import { formatDate } from '@/lib/format';
import type { WaterTest } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';

function readingSummary(t: WaterTest): string {
  const parts = [
    t.temperature_c !== null ? `${t.temperature_c} °C` : null,
    t.ph !== null ? `pH ${t.ph}` : null,
    t.ammonia !== null ? `NH3 ${t.ammonia}` : null,
    t.nitrite !== null ? `NO2 ${t.nitrite}` : null,
    t.nitrate !== null ? `NO3 ${t.nitrate}` : null,
    t.gh !== null ? `GH ${t.gh}` : null,
    t.kh !== null ? `KH ${t.kh}` : null,
  ];
  return parts.filter(Boolean).join(' · ') || 'No readings';
}

export default function TankScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useFocusData(async () => {
    const [tank, fish, tests, changes, allSpawns, movesIn, allFish] = await Promise.all([
      getTank(id),
      listFishInTank(id),
      listWaterTests(id),
      listWaterChanges(id),
      listSpawns(),
      spawnMovesIntoTank(id),
      listFish(),
    ]);
    // Spawns kept in this tank, and spawns that had part of their batch moved here.
    const spawns = allSpawns.filter((s) => s.tank_id === id);
    const partSpawns = allSpawns.filter((s) => s.tank_id !== id && movesIn.some((m) => m.spawn_id === s.id));
    const events = await listSpawnEvents([...spawns, ...partSpawns].map((s) => s.id));
    return { tank, fish, tests, changes, spawns, partSpawns, movesIn, events, allFish };
  });

  if (!data && !error) return <Loading />;
  const tank = data?.tank;
  if (!tank) {
    return (
      <Screen>
        <ErrorText message={error ?? 'This tank was not found in your account.'} />
      </Screen>
    );
  }

  const fish = data.fish.filter((f) => !INACTIVE_STATUSES.includes(f.status));
  const latest = data.tests[0];
  const go = (pathname: string, params: Record<string, string> = {}) =>
    router.push({ pathname: pathname as never, params: { id, ...params } });

  return (
    <Screen>
      <Stack.Screen options={{ title: tank.tank_code }} />

      <Card>
        <InfoRow label="Name" value={tank.name} />
        <InfoRow label="Purpose" value={labelOf(TANK_PURPOSES, tank.purpose)} />
        <InfoRow label="Size" value={tank.size_gallons ? `${tank.size_gallons} gallons` : null} />
        {tank.notes ? <Muted>{tank.notes}</Muted> : null}
      </Card>

      <View style={styles.buttons}>
        <View style={styles.half}>
          <Button title="Edit" icon={Icons.edit} variant="secondary" small onPress={() => go('/tanks/[id]/edit')} />
        </View>
        <View style={styles.half}>
          <Button title="QR code" icon={Icons.qr} variant="secondary" small onPress={() => go('/tanks/[id]/qr')} />
        </View>
      </View>

      <Section
        title={`Fish (${fish.length})`}
        action={<Button title="Move fish here" icon={Icons.move} small onPress={() => go('/tanks/[id]/add-fish')} />}>
        {fish.length === 0 ? <Empty>No fish in this tank.</Empty> : null}
        <Button
          title="Add new fish"
          variant="secondary"
          small
          onPress={() => router.push({ pathname: '/fish/new', params: { tankId: id } })}
        />
        {fish.map((f) => (
          <ListRow
            icon={Icons.fish}
            key={f.id}
            title={f.fish_code}
            subtitle={[f.name, f.strain, labelOf(FISH_STATUSES, f.status)].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/fish/[id]', params: { id: f.id } })}
          />
        ))}
      </Section>

      {data.spawns.length + data.partSpawns.length > 0 ? (
        <Section title="Fry batches">
          {data.spawns.map((s) => {
            const batch = summarizeBatch(s, data.events, data.allFish);
            return (
              <ListRow
            icon={Icons.spawn}
                key={s.id}
                title={`${s.spawn_code} · born ${formatDate(s.born_on)}`}
                subtitle={`${batch.remaining} of ${s.fry_count} fry`}
                onPress={() => router.push({ pathname: '/spawns/[id]', params: { id: s.id } })}
              />
            );
          })}
          {data.partSpawns.map((s) => {
            const moved = data.movesIn.filter((m) => m.spawn_id === s.id).reduce((n, m) => n + (m.count ?? 0), 0);
            return (
              <ListRow
            icon={Icons.spawn}
                key={s.id}
                title={`${s.spawn_code} · born ${formatDate(s.born_on)}`}
                subtitle={`${moved} fry moved here from the batch`}
                onPress={() => router.push({ pathname: '/spawns/[id]', params: { id: s.id } })}
              />
            );
          })}
        </Section>
      ) : null}

      <Section
        title="Water tests"
        action={<Button title="Log test" icon={Icons.waterTest} small onPress={() => go('/tanks/[id]/water-test')} />}>
        {latest ? (
          <Card>
            <Muted>Latest, {formatDate(latest.tested_on)}</Muted>
            <InfoRow label="Temperature" value={latest.temperature_c !== null ? `${latest.temperature_c} °C` : null} />
            <InfoRow label="pH" value={latest.ph} />
            <InfoRow label="Ammonia" value={latest.ammonia !== null ? `${latest.ammonia} ppm` : null} />
            <InfoRow label="Nitrite" value={latest.nitrite !== null ? `${latest.nitrite} ppm` : null} />
            <InfoRow label="Nitrate" value={latest.nitrate !== null ? `${latest.nitrate} ppm` : null} />
            <InfoRow label="GH" value={latest.gh !== null ? `${latest.gh} dGH` : null} />
            <InfoRow label="KH" value={latest.kh !== null ? `${latest.kh} dKH` : null} />
          </Card>
        ) : (
          <Empty>No water tests logged yet.</Empty>
        )}
        {data.tests.map((t) => (
          <ListRow
            icon={Icons.waterTest}
            key={t.id}
            title={formatDate(t.tested_on)}
            subtitle={readingSummary(t)}
            onPress={() => go('/tanks/[id]/water-test', { testId: t.id })}
          />
        ))}
      </Section>

      <Section
        title="Water changes"
        action={<Button title="Log change" icon={Icons.waterChange} small onPress={() => go('/tanks/[id]/water-change')} />}>
        {data.changes.length === 0 ? <Empty>No water changes logged yet.</Empty> : null}
        {data.changes.map((c) => (
          <ListRow
            icon={Icons.waterChange}
            key={c.id}
            title={formatDate(c.changed_on)}
            subtitle={[c.percent !== null ? `${c.percent}% changed` : null, c.notes].filter(Boolean).join(' · ')}
            onPress={() => go('/tanks/[id]/water-change', { changeId: c.id })}
          />
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});
