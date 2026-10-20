import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { pickPhoto } from '@/components/fish-form';
import { type FishPageContext, loadFishPage } from '@/components/fish-page/data';
import { FishFamily } from '@/components/fish-page/family';
import { FishHistory } from '@/components/fish-page/history';
import { FishOverview } from '@/components/fish-page/overview';
import { FishScores } from '@/components/fish-page/scores';
import { Button, Card, ErrorText, Icon, Loading, Muted, Screen, SegmentedTabs } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { FISH_STATUSES, labelOf, SEXES, TAIL_OPTIONS } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { addFishPhoto, deleteFishPhoto } from '@/lib/db';
import { formatAge } from '@/lib/format';
import { makeKinship } from '@/lib/kinship';
import { littermates, scoreLabel } from '@/lib/scores';
import type { FishPhoto } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'scores', label: 'Scores' },
  { value: 'family', label: 'Family' },
  { value: 'history', label: 'History' },
] as const;

type Tab = (typeof TABS)[number]['value'];

// One fish: a header card with what matters at a glance, then its details split into four tabs.
export default function FishScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.value === tabParam) ? tabParam! : 'overview');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = useFocusData(() => loadFishPage(id));

  if (!data && !error) return <Loading />;
  const fish = data?.fish;
  if (!data || !fish) {
    return (
      <Screen>
        <ErrorText message={error ?? 'This fish was not found in your account.'} />
      </Screen>
    );
  }

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

  const byId = Object.fromEntries(data.allFish.map((f) => [f.id, f]));
  const ctx: FishPageContext = {
    id,
    fish,
    data,
    kin: makeKinship(data.allFish),
    sire: fish.sire_id ? byId[fish.sire_id] ?? null : null,
    dam: fish.dam_id ? byId[fish.dam_id] ?? null : null,
    siblings: littermates(fish, data.allFish),
    offspring: data.allFish.filter((f) => f.sire_id === id || f.dam_id === id),
    fromSpawn: fish.spawn_id ? data.spawns.find((s) => s.id === fish.spawn_id) : null,
    parentOf: data.spawns.filter((s) => s.sire_id === id || s.dam_id === id),
    busy,
    photoWidth: width - Spacing.three * 2,
    addPhoto: async (source) => {
      const picked = await pickPhoto(source);
      if (!picked || !session) return;
      await run(() => addFishPhoto(session.user.id, id, picked.base64, picked.mimeType));
    },
    confirmDeletePhoto: (photo: FishPhoto) =>
      Alert.alert('Delete this photo?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteFishPhoto(photo)) },
      ]),
    openFish: (fid) => router.push({ pathname: '/fish/[id]', params: { id: fid } }),
    openSpawn: (sid) => router.push({ pathname: '/spawns/[id]', params: { id: sid } }),
  };

  const cover = data.photos.map((p) => data.urls[p.storage_path]).find(Boolean);
  const best = data.bestScores.get(id);
  const placing = data.bestPlacings.get(id);

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: fish.fish_code }} />

      <Card style={styles.header}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, styles.noCover, { backgroundColor: theme.backgroundSelected }]}>
            <Icon name={Icons.fish} size={30} color={theme.textSecondary} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={[styles.code, { color: theme.text }]} numberOfLines={1}>
            {fish.fish_code}
          </Text>
          {fish.name ? <Muted>{fish.name}</Muted> : null}
          <Muted>
            {[labelOf(SEXES, fish.sex), labelOf(TAIL_OPTIONS, fish.tail_standard), formatAge(fish.date_of_birth)]
              .filter(Boolean)
              .join(' · ')}
          </Muted>
          <Muted>
            {[labelOf(FISH_STATUSES, fish.status), fish.tank_id ? data.tankNames[fish.tank_id] : null]
              .filter(Boolean)
              .join(' · ')}
          </Muted>
          {best || placing ? (
            <Text style={[styles.best, { color: theme.accent }]}>
              {[best ? `Best IHS ${scoreLabel(best)}` : null, placing].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      </Card>

      <ErrorText message={actionError} />
      <View style={styles.buttons}>
        <View style={styles.half}>
          <Button
            title="Edit"
            icon={Icons.edit}
            variant="secondary"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/edit', params: { id } })}
          />
        </View>
        <View style={styles.half}>
          <Button
            title="Move"
            icon={Icons.move}
            small
            onPress={() => router.push({ pathname: '/fish/[id]/move', params: { id } })}
          />
        </View>
        <View style={styles.half}>
          <Button
            title="Score"
            icon={Icons.evaluation}
            variant="secondary"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/evaluation', params: { id } })}
          />
        </View>
      </View>

      <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

      {tab === 'overview' ? <FishOverview ctx={ctx} /> : null}
      {tab === 'scores' ? <FishScores ctx={ctx} /> : null}
      {tab === 'family' ? <FishFamily ctx={ctx} /> : null}
      {tab === 'history' ? <FishHistory ctx={ctx} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  cover: { width: 96, height: 96, borderRadius: 12 },
  noCover: { alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  code: { fontSize: 22, fontWeight: '700' },
  best: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});
