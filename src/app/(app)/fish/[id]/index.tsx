import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { pickPhoto } from '@/components/fish-form';
import { fishLabel } from '@/components/fish-picker';
import {
  Body,
  Button,
  Card,
  Empty,
  ErrorText,
  InfoRow,
  ListRow,
  Loading,
  Muted,
  Screen,
  Section,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  BASE_COLOURS,
  COVER_COLOURS,
  EVALUATION_KINDS,
  FISH_STATUSES,
  ihsMaxTotal,
  labelOf,
  ORIGINS,
  SEXES,
  TAIL_STANDARDS,
} from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { isDisqualified } from '@/lib/ihs-reasons';
import {
  addFishPhoto,
  deleteFishPhoto,
  groupIdsForFish,
  listEvaluations,
  listFish,
  listFishTraits,
  listGroups,
  listFishMoves,
  listFishPhotos,
  listSpawns,
  listTanks,
  listTraits,
  signedPhotoUrls,
  updateFish,
} from '@/lib/db';
import { formatAge, formatDate } from '@/lib/format';
import type { FishPhoto } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';

export default function FishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = useFocusData(async () => {
    const [allFish, tanks, photos, moves, spawns, groups, groupIds, traitRecords, evaluations, traits] =
      await Promise.all([
      listFish(),
      listTanks(),
      listFishPhotos(id),
      listFishMoves(id),
      listSpawns(),
      listGroups(),
      groupIdsForFish(id),
      listFishTraits(id),
      listEvaluations(id),
      listTraits(),
    ]);
    const urls = await signedPhotoUrls(photos.map((p) => p.storage_path));
    return {
      fish: allFish.find((f) => f.id === id) ?? null,
      allFish,
      tankNames: Object.fromEntries(tanks.map((t) => [t.id, t.name ? `${t.tank_code} ${t.name}` : t.tank_code])),
      photos,
      urls,
      moves,
      spawns,
      groups: groups.filter((g) => groupIds.includes(g.id)),
      traitRecords,
      evaluations,
      traitNames: Object.fromEntries(traits.map((t) => [t.id, t.name])),
    };
  });

  if (!data && !error) return <Loading />;
  const fish = data?.fish;
  if (!data || !fish) {
    return (
      <Screen>
        <ErrorText message={error ?? 'This fish was not found in your account.'} />
      </Screen>
    );
  }

  const byId = Object.fromEntries(data.allFish.map((f) => [f.id, f]));
  const sire = fish.sire_id ? byId[fish.sire_id] : null;
  const dam = fish.dam_id ? byId[fish.dam_id] : null;
  const offspring = data.allFish.filter((f) => f.sire_id === id || f.dam_id === id);
  const fromSpawn = fish.spawn_id ? data.spawns.find((s) => s.id === fish.spawn_id) : null;
  const parentOf = data.spawns.filter((s) => s.sire_id === id || s.dam_id === id);
  const openSpawn = (sid: string) => router.push({ pathname: '/spawns/[id]', params: { id: sid } });
  const openFish = (fid: string) => router.push({ pathname: '/fish/[id]', params: { id: fid } });

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  async function addPhoto(source: 'camera' | 'library') {
    const picked = await pickPhoto(source);
    if (!picked || !session) return;
    await run(() => addFishPhoto(session.user.id, id, picked.base64, picked.mimeType));
  }

  function confirmDeletePhoto(photo: FishPhoto) {
    Alert.alert('Delete this photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteFishPhoto(photo)) },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: fish.fish_code }} />

      {data.photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {data.photos.map((p) =>
            data.urls[p.storage_path] ? (
              <Pressable key={p.id} onLongPress={() => confirmDeletePhoto(p)}>
                <Image source={{ uri: data.urls[p.storage_path] }} style={styles.photo} contentFit="cover" />
                <Muted>{formatDate(p.taken_on)}</Muted>
              </Pressable>
            ) : null,
          )}
        </ScrollView>
      ) : null}
      <View style={styles.buttons}>
        <View style={styles.half}>
          <Button title="Take photo" variant="secondary" small onPress={() => addPhoto('camera')} disabled={busy} />
        </View>
        <View style={styles.half}>
          <Button title="Add from library" variant="secondary" small onPress={() => addPhoto('library')} disabled={busy} />
        </View>
      </View>
      {data.photos.length > 1 ? <Muted>Press and hold a photo to delete it.</Muted> : null}

      <Card>
        <InfoRow label="Name" value={fish.name} />
        <InfoRow label="Sex" value={labelOf(SEXES, fish.sex)} />
        <InfoRow label="Tail standard" value={labelOf(TAIL_STANDARDS, fish.tail_standard)} />
        <InfoRow label="Base colour" value={labelOf(BASE_COLOURS, fish.base_colour)} />
        <InfoRow
          label="Cover colour"
          value={fish.cover_colours.map((c) => labelOf(COVER_COLOURS, c)).join(', ')}
        />
        <InfoRow label="Strain" value={fish.strain} />
        <InfoRow
          label="Date of birth"
          value={fish.date_of_birth ? `${formatDate(fish.date_of_birth)} (${formatAge(fish.date_of_birth)})` : null}
        />
        <InfoRow label="Generation" value={fish.generation} />
        <InfoRow label="Origin" value={labelOf(ORIGINS, fish.origin)} />
        <InfoRow label="Foundation" value={fish.foundation ? 'Yes' : 'No'} />
        <InfoRow label="Original breeder" value={fish.original_breeder} />
        <InfoRow label="Tank" value={fish.tank_id ? data.tankNames[fish.tank_id] : 'None'} />
        <InfoRow label="Status" value={labelOf(FISH_STATUSES, fish.status)} />
        <InfoRow label="Earlier IDs" value={fish.previous_codes.join(', ')} />
        {fromSpawn ? (
          <InfoRow
            label="Picked from"
            value={
              <Body style={styles.link} onPress={() => openSpawn(fromSpawn.id)}>
                {fromSpawn.spawn_code}
              </Body>
            }
          />
        ) : null}
        <InfoRow label="Why picked" value={fish.pick_reason} />
        {fish.notes ? <Body>{fish.notes}</Body> : null}
      </Card>

      <ErrorText message={actionError} />
      <View style={styles.buttons}>
        <View style={styles.half}>
          <Button
            title="Edit"
            variant="secondary"
            onPress={() => router.push({ pathname: '/fish/[id]/edit', params: { id } })}
          />
        </View>
        <View style={styles.half}>
          <Button title="Move" onPress={() => router.push({ pathname: '/fish/[id]/move', params: { id } })} />
        </View>
      </View>
      {fish.status === 'for_sale' ? (
        <Button
          title="Mark as sold"
          variant="secondary"
          busy={busy}
          onPress={() => run(() => updateFish(id, { status: 'sold', tank_id: null }))}
        />
      ) : null}

      <Section
        title="Traits"
        action={
          <Button
            title="Record trait"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/trait', params: { id } })}
          />
        }>
        {data.traitRecords.length === 0 ? <Empty>No traits recorded yet.</Empty> : null}
        {data.traitRecords.map((t) => (
          <ListRow
            key={t.id}
            title={`${data.traitNames[t.trait_id] ?? 'Trait'} · ${formatDate(t.recorded_on)}`}
            subtitle={[t.value, t.score !== null ? `Score ${t.score}` : null, t.notes].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/fish/[id]/trait', params: { id, recordId: t.id } })}
          />
        ))}
      </Section>

      <Section
        title="IHS evaluations"
        action={
          <Button
            title="Score"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/evaluation', params: { id } })}
          />
        }>
        {data.evaluations.length === 0 ? <Empty>No evaluations yet.</Empty> : null}
        {data.evaluations.map((e) => (
          <ListRow
            key={e.id}
            title={`${e.total} / ${ihsMaxTotal(e.sex)} · ${formatDate(e.evaluated_on)}`}
            subtitle={[
              isDisqualified(e.sex, e.score_reasons ?? {}) ? 'Disqualified' : null,
              labelOf(EVALUATION_KINDS, e.kind),
              e.event,
              e.placement,
              e.judge,
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => router.push({ pathname: '/fish/[id]/evaluation', params: { id, evalId: e.id } })}
          />
        ))}
      </Section>

      <Section
        title="Parents"
        action={
          <Button
            title="Pedigree"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/pedigree', params: { id } })}
          />
        }>
        {sire ? (
          <ListRow title={`Sire · ${sire.fish_code}`} subtitle={fishLabel(sire)} onPress={() => openFish(sire.id)} />
        ) : (
          <ListRow title="Sire · Unknown" />
        )}
        {dam ? (
          <ListRow title={`Dam · ${dam.fish_code}`} subtitle={fishLabel(dam)} onPress={() => openFish(dam.id)} />
        ) : (
          <ListRow title="Dam · Unknown" />
        )}
      </Section>

      {data.groups.length > 0 ? (
        <Section title="Breeding groups">
          {data.groups.map((g) => (
            <ListRow
              key={g.id}
              title={g.name ? `${g.group_code} · ${g.name}` : g.group_code}
              subtitle={[g.goal, g.ended_on ? `Ended ${formatDate(g.ended_on)}` : 'Active'].filter(Boolean).join(' · ')}
              onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}
            />
          ))}
        </Section>
      ) : null}

      {parentOf.length > 0 ? (
        <Section title={`Spawns as a parent (${parentOf.length})`}>
          {parentOf.map((s) => (
            <ListRow
              key={s.id}
              title={`${s.spawn_code} · born ${formatDate(s.born_on)}`}
              subtitle={`${s.fry_count} fry at birth`}
              onPress={() => openSpawn(s.id)}
            />
          ))}
        </Section>
      ) : null}

      <Section title={`Offspring (${offspring.length})`}>
        {offspring.length === 0 ? <Empty>No recorded offspring yet.</Empty> : null}
        {offspring.map((f) => (
          <ListRow
            key={f.id}
            title={f.fish_code}
            subtitle={[f.name, f.strain, labelOf(FISH_STATUSES, f.status)].filter(Boolean).join(' · ')}
            onPress={() => openFish(f.id)}
          />
        ))}
      </Section>

      <Section title="Tank history">
        {data.moves.length === 0 ? <Empty>No moves recorded.</Empty> : null}
        {data.moves.map((m) => (
          <ListRow
            key={m.id}
            title={formatDate(m.moved_at)}
            subtitle={`${m.from_tank_id ? data.tankNames[m.from_tank_id] ?? 'Deleted tank' : 'No tank'} → ${
              m.to_tank_id ? data.tankNames[m.to_tank_id] ?? 'Deleted tank' : 'No tank'
            }`}
          />
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photos: { gap: Spacing.two },
  photo: { width: 260, height: 195, borderRadius: 12 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  link: { textDecorationLine: 'underline', fontWeight: '500' },
});
