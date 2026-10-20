import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

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
import { Icons } from '@/constants/icons';
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
  TAIL_OPTIONS,
} from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { isDisqualified } from '@/lib/ihs-reasons';
import {
  addFishPhoto,
  deleteFishPhoto,
  groupIdsForFish,
  listAllShowEntries,
  listEvaluationSummaries,
  listEvaluations,
  listSales,
  listShowEntries,
  listFish,
  listFishGenes,
  listFishTraits,
  listGenes,
  listGroups,
  listFishMoves,
  listFishPhotos,
  listSpawns,
  listTanks,
  listTraits,
  signedPhotoUrls,
} from '@/lib/db';
import { formatAge, formatDate } from '@/lib/format';
import { copiesLabel, inferredCarrier } from '@/lib/genetics';
import type { Fish, FishPhoto } from '@/lib/types';
import { formatInbreeding, makeKinship } from '@/lib/kinship';
import { bestPlacings, bestScores, littermates, resultsByFish, scoreLabel } from '@/lib/scores';
import { useFocusData } from '@/lib/use-data';

export default function FishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const photoWidth = width - Spacing.three * 2;
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = useFocusData(async () => {
    const [
      allFish, tanks, photos, moves, spawns, groups, groupIds, traitRecords, evaluations, traits, shows, sales, genes, geneRecords,
      allScores, allShows,
    ] = await Promise.all([
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
      listShowEntries(id),
      listSales(id),
      listGenes(),
      listFishGenes(),
      listEvaluationSummaries(),
      listAllShowEntries(),
    ]);
    const urls = await signedPhotoUrls([
      ...photos.map((p) => p.storage_path),
      ...evaluations.map((e) => e.photo_path).filter((p): p is string => !!p),
    ]);
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
      shows,
      sales,
      genes,
      geneRecords,
      bestScores: bestScores(allScores),
      bestPlacings: bestPlacings(allShows),
      results: resultsByFish(allScores, allShows),
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
  const kin = makeKinship(data.allFish);
  const sire = fish.sire_id ? byId[fish.sire_id] : null;
  const dam = fish.dam_id ? byId[fish.dam_id] : null;
  const siblings = littermates(fish, data.allFish);
  const scoredSiblings = siblings.filter((f) => data.bestScores.has(f.id)).length;
  const offspring = data.allFish.filter((f) => f.sire_id === id || f.dam_id === id);
  const fromSpawn = fish.spawn_id ? data.spawns.find((s) => s.id === fish.spawn_id) : null;
  const parentOf = data.spawns.filter((s) => s.sire_id === id || s.dam_id === id);
  const openSpawn = (sid: string) => router.push({ pathname: '/spawns/[id]', params: { id: sid } });
  const withResult = (f: Fish) => [fishLabel(f), data.results.get(f.id)].filter(Boolean).join(' · ');
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // Full-width photos that snap one at a time, like the Photos app.
          snapToInterval={photoWidth + Spacing.two}
          decelerationRate="fast"
          contentContainerStyle={styles.photos}>
          {data.photos.map((p) =>
            data.urls[p.storage_path] ? (
              <Pressable key={p.id} onLongPress={() => confirmDeletePhoto(p)}>
                <Image
                  source={{ uri: data.urls[p.storage_path] }}
                  style={[styles.photo, { width: photoWidth, height: photoWidth * 0.75 }]}
                  contentFit="cover"
                  transition={150}
                />
                <Muted>{formatDate(p.taken_on)}</Muted>
              </Pressable>
            ) : null,
          )}
        </ScrollView>
      ) : null}
      <View style={styles.buttons}>
        <View style={styles.half}>
          <Button title="Take photo" icon={Icons.camera} variant="secondary" small onPress={() => addPhoto('camera')} disabled={busy} />
        </View>
        <View style={styles.half}>
          <Button title="Add from library" icon={Icons.library} variant="secondary" small onPress={() => addPhoto('library')} disabled={busy} />
        </View>
      </View>
      {data.photos.length > 1 ? <Muted>Press and hold a photo to delete it.</Muted> : null}

      <Card>
        <InfoRow label="Name" value={fish.name} />
        <InfoRow label="Sex" value={labelOf(SEXES, fish.sex)} />
        <InfoRow label="Tail standard" value={labelOf(TAIL_OPTIONS, fish.tail_standard)} />
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
        <InfoRow
          label="Inbreeding"
          value={
            fish.sire_id && fish.dam_id
              ? `${formatInbreeding(kin.inbreeding(fish.id))} · ${kin.generationsKnown(fish.id)} generations recorded`
              : 'Unknown, both parents needed'
          }
        />
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
            icon={Icons.edit}
            variant="secondary"
            onPress={() => router.push({ pathname: '/fish/[id]/edit', params: { id } })}
          />
        </View>
        <View style={styles.half}>
          <Button title="Move" icon={Icons.move} onPress={() => router.push({ pathname: '/fish/[id]/move', params: { id } })} />
        </View>
      </View>
      <Button
        title="Remind me about this fish"
        icon={Icons.reminder}
        variant="secondary"
        small
        onPress={() => router.push({ pathname: '/reminders/edit', params: { fishId: id } })}
      />
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
            icon={Icons.trait}
            key={t.id}
            title={`${data.traitNames[t.trait_id] ?? 'Trait'} · ${formatDate(t.recorded_on)}`}
            subtitle={[t.value, t.score !== null ? `Score ${t.score}` : null, t.notes].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/fish/[id]/trait', params: { id, recordId: t.id } })}
          />
        ))}
      </Section>

      <Section
        title="Colour genes"
        action={
          <Button title="Edit genes" small onPress={() => router.push({ pathname: '/fish/[id]/genes', params: { id } })} />
        }>
        {(() => {
          const copiesOf = (fid: string, gid: string) =>
            data.geneRecords.find((r) => r.fish_id === fid && r.gene_id === gid)?.copies;
          const lines = data.genes
            .map((g) => {
              const c = copiesOf(id, g.id);
              if (c !== undefined) return `${g.name}: ${copiesLabel(g.mode, fish.sex, c)}`;
              return inferredCarrier(fish, g, (fid) => copiesOf(fid, g.id)) ? `${g.name}: Carrier (from a parent)` : null;
            })
            .filter((l): l is string => !!l);
          return lines.length === 0 ? (
            <Empty>No genes recorded. Record genes like blond or albino to predict what pairings will throw.</Empty>
          ) : (
            <Card>
              {lines.map((l) => (
                <Body key={l}>{l}</Body>
              ))}
            </Card>
          );
        })()}
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
            icon={Icons.evaluation}
            key={e.id}
            title={`${e.total} / ${ihsMaxTotal(e.sex)} · ${formatDate(e.evaluated_on)}`}
            subtitle={[
              isDisqualified(e.sex, e.score_reasons ?? {}) ? 'Disqualified' : null,
              e.locked_at ? 'Signed' : null,
              labelOf(EVALUATION_KINDS, e.kind),
              e.event,
              e.placement,
              e.judge,
            ]
              .filter(Boolean)
              .join(' · ')}
            right={
              e.photo_path && data.urls[e.photo_path] ? (
                <Image source={{ uri: data.urls[e.photo_path] }} style={styles.evalThumb} contentFit="cover" />
              ) : undefined
            }
            onPress={() => router.push({ pathname: '/fish/[id]/evaluation', params: { id, evalId: e.id } })}
          />
        ))}
        {data.evaluations.length > 0 ? (
          <Button
            title="Score history with photos"
            icon={Icons.strain}
            variant="secondary"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/scores', params: { id } })}
          />
        ) : null}
      </Section>

      <Section title="Shows">
        {data.shows.length === 0 ? (
          <Empty>Shows appear here when you score this fish as an official show result.</Empty>
        ) : null}
        {data.shows.map((e) => (
          <ListRow
            icon={Icons.show}
            key={e.id}
            title={`${e.show_name} · ${formatDate(e.shown_on)}`}
            subtitle={[e.show_class, e.placement, e.points !== null ? `${e.points} pts` : null].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/fish/[id]/show', params: { id, entryId: e.id } })}
          />
        ))}
      </Section>

      <Section
        title="Sales"
        action={
          fish.status === 'sold' ? null : (
            <Button
              title="Record sale"
              small
              onPress={() => router.push({ pathname: '/fish/[id]/sale', params: { id } })}
            />
          )
        }>
        {data.sales.length === 0 ? (
          <Empty>{fish.status === 'sold' ? 'Marked sold, with no sale details.' : 'Not sold.'}</Empty>
        ) : null}
        {data.sales.map((s) => (
          <ListRow
            icon={Icons.sale}
            key={s.id}
            title={`${s.price !== null ? `${s.price.toFixed(2)} ${s.currency}` : 'Sold'} · ${formatDate(s.sold_on)}`}
            subtitle={[s.buyer, s.notes].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/fish/[id]/sale', params: { id, saleId: s.id } })}
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
          <ListRow icon={Icons.fish} title={`Sire · ${sire.fish_code}`} subtitle={withResult(sire)} onPress={() => openFish(sire.id)} />
        ) : (
          <ListRow title="Sire · Unknown" />
        )}
        {dam ? (
          <ListRow icon={Icons.fish} title={`Dam · ${dam.fish_code}`} subtitle={withResult(dam)} onPress={() => openFish(dam.id)} />
        ) : (
          <ListRow title="Dam · Unknown" />
        )}
      </Section>

      {siblings.length > 0 ? (
        <Section title={`Littermates (${siblings.length})`}>
          <Muted>
            {scoredSiblings === 0
              ? 'None scored yet. Sold fish stay here, so a score from a fish that was auctioned still counts for this litter.'
              : `${scoredSiblings} of ${siblings.length} scored. Sold fish are included.`}
          </Muted>
          {siblings.map((f) => {
            const best = data.bestScores.get(f.id);
            return (
              <ListRow
                icon={Icons.fish}
                key={f.id}
                title={best ? `${f.fish_code} · ${scoreLabel(best)}` : f.fish_code}
                subtitle={[labelOf(SEXES, f.sex), labelOf(FISH_STATUSES, f.status), data.bestPlacings.get(f.id)]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => openFish(f.id)}
              />
            );
          })}
        </Section>
      ) : null}

      {data.groups.length > 0 ? (
        <Section title="Breeding groups">
          {data.groups.map((g) => (
            <ListRow
            icon={Icons.group}
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
              icon={Icons.spawn}
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
            icon={Icons.fish}
            key={f.id}
            title={f.fish_code}
            subtitle={[f.name, f.strain, labelOf(FISH_STATUSES, f.status), data.results.get(f.id)].filter(Boolean).join(' · ')}
            onPress={() => openFish(f.id)}
          />
        ))}
      </Section>

      <Section title="Tank history">
        {data.moves.length === 0 ? <Empty>No moves recorded.</Empty> : null}
        {data.moves.map((m) => (
          <ListRow
            icon={Icons.move}
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
  photo: { borderRadius: 14 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  link: { textDecorationLine: 'underline', fontWeight: '500' },
  evalThumb: { width: 44, height: 44, borderRadius: 6 },
});
