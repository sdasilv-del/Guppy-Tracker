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
import { LineGuppy } from '@/components/line-icons';
import { Button, ErrorText, Loading, Screen, SegmentedTabs } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Display, Spacing } from '@/constants/theme';
import { FISH_STATUSES, ihsMaxTotal, labelOf, SEXES, TAIL_OPTIONS } from '@/lib/constants';
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

// One fish: a photo-led header with what matters at a glance, then its details split into four tabs.
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

  // Inbreeding only looks up the tree, so the fish and its recorded ancestors are enough.
  const lineage = [fish, ...data.ancestors];
  const byId = Object.fromEntries(lineage.map((f) => [f.id, f]));
  const ctx: FishPageContext = {
    id,
    fish,
    data,
    kin: makeKinship(lineage),
    sire: fish.sire_id ? byId[fish.sire_id] ?? null : null,
    dam: fish.dam_id ? byId[fish.dam_id] ?? null : null,
    siblings: littermates(fish, data.siblings),
    offspring: data.offspring,
    fromSpawn: data.fromSpawn,
    parentOf: data.parentOf,
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

      <View style={styles.header}>
        {cover ? (
          <Image source={{ uri: cover }} style={[styles.cover, { borderColor: theme.divider }]} contentFit="cover" />
        ) : (
          <View style={[styles.cover, styles.noCover, { backgroundColor: theme.backgroundElement, borderColor: theme.divider }]}>
            <LineGuppy tail={fish.tail_standard} size={96} />
          </View>
        )}

        <View style={styles.titleRow}>
          <View style={styles.headerText}>
            <Text style={[styles.code, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {fish.fish_code}
            </Text>
            {fish.name ? <Text style={[styles.name, { color: theme.textSecondary }]}>{fish.name}</Text> : null}
            <Text style={[styles.caps, { color: theme.textSecondary }]}>
              {[labelOf(SEXES, fish.sex), labelOf(TAIL_OPTIONS, fish.tail_standard), formatAge(fish.date_of_birth)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          {best ? (
            <View style={styles.score} accessible accessibilityLabel={`Best IHS ${scoreLabel(best)}`}>
              <Text style={[styles.scoreValue, { color: theme.highlight }]}>{best.total}</Text>
              <Text style={[styles.capsSmall, { color: theme.textSecondary }]}>
                Best IHS / {ihsMaxTotal(best.sex)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.rule, { backgroundColor: theme.accent }]} />

        <View style={styles.details}>
          <Detail label="Status" value={labelOf(FISH_STATUSES, fish.status)} />
          <Detail label="Tank" value={fish.tank_id ? data.tankNames[fish.tank_id] : null} />
          <Detail label={placing ? 'Best placing' : 'Strain'} value={placing ?? fish.strain} highlight={!!placing} />
        </View>
      </View>

      <ErrorText message={actionError} />
      <View style={styles.buttons}>
        <View style={styles.wide}>
          <Button
            title="Score"
            icon={Icons.evaluation}
            small
            onPress={() => router.push({ pathname: '/fish/[id]/evaluation', params: { id } })}
          />
        </View>
        <View style={styles.half}>
          <Button
            title="Move"
            icon={Icons.move}
            variant="secondary"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/move', params: { id } })}
          />
        </View>
        <View style={styles.half}>
          <Button
            title="Edit"
            icon={Icons.edit}
            variant="secondary"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/edit', params: { id } })}
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

// A small labelled value under the fish's name, such as its status or tank.
function Detail({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.detail}>
      <Text style={[styles.capsSmall, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: highlight ? theme.accent : theme.text }]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three },
  cover: { width: '100%', aspectRatio: 16 / 10, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  noCover: { alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  headerText: { flex: 1, gap: Spacing.one },
  code: { fontFamily: Display.semibold, fontSize: 36, lineHeight: 40, fontVariant: ['lining-nums', 'tabular-nums'] },
  name: { fontFamily: Display.italic, fontSize: 19 },
  caps: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.6 },
  capsSmall: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.4 },
  score: { alignItems: 'flex-end', gap: 2 },
  scoreValue: { fontFamily: Display.medium, fontSize: 44, lineHeight: 46, fontVariant: ['lining-nums', 'tabular-nums'] },
  rule: { height: StyleSheet.hairlineWidth, opacity: 0.6 },
  details: { flexDirection: 'row', gap: Spacing.three },
  detail: { flex: 1, gap: Spacing.one },
  detailValue: { fontSize: 15 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  wide: { flex: 1.4 },
  half: { flex: 1 },
});
