import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { FishPageContext } from '@/components/fish-page/data';
import { Body, Button, Card, Empty, InfoRow, ListRow, Muted, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { BASE_COLOURS, COVER_COLOURS, FISH_STATUSES, labelOf, ORIGINS, SEXES, TAIL_OPTIONS } from '@/lib/constants';
import { formatAge, formatDate } from '@/lib/format';
import { copiesLabel, inferredCarrier } from '@/lib/genetics';
import { formatInbreeding } from '@/lib/kinship';

// The Overview tab: photos, details, traits and colour genes.
export function FishOverview({ ctx }: { ctx: FishPageContext }) {
  const { id, fish, data, kin, fromSpawn, busy, photoWidth, addPhoto, confirmDeletePhoto, openSpawn } = ctx;
  return (
    <>
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

    </>
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
