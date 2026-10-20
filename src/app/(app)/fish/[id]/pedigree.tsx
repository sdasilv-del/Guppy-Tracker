import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button, Card, ErrorText, ListRow, Loading, Muted, Screen, SegmentedTabs } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { ihsMaxTotal, labelOf, SEXES, TAIL_STANDARDS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import {
  getFish,
  latestPhotoPaths,
  listAncestors,
  listBestScores,
  listEvaluations,
  listLittermates,
  listShowEntriesForFish,
  signedPhotoUrls,
} from '@/lib/db';
import { bestEvaluation, certificateHtml } from '@/lib/export';
import { PEDIGREE_DEPTH, pedigreeColumns, relationLabel, repeatedAncestors } from '@/lib/pedigree';
import { littermates, resultsByFish } from '@/lib/scores';
import { imageDataUri, printHtml } from '@/lib/share';
import type { Fish } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';
import { useTheme } from '@/hooks/use-theme';

const COLUMN_TITLES = ['Fish', 'Parents', 'Grandparents', 'Great-grandparents', 'Great-great-grandparents'];
const SLOT = 64;
const COLUMN_WIDTH = 150;
const VIEWS = [
  { value: 'tree', label: 'Tree' },
  { value: 'list', label: 'List' },
] as const;
type PedigreeView = (typeof VIEWS)[number]['value'];

// Strain, generation and tail, e.g. "Blue Moscow · F3 · Delta".
function details(fish: Fish): string {
  const tail = labelOf(TAIL_STANDARDS, fish.tail_standard).split(' ').slice(1).join(' ');
  return [fish.strain, fish.generation, tail].filter(Boolean).join(' · ');
}

function Box({
  fish,
  relation,
  repeats,
  result,
}: {
  fish: Fish | null;
  relation: string;
  repeats: number;
  result?: string;
}) {
  const theme = useTheme();
  const info = fish ? details(fish) : '';
  const label = fish
    ? [`${relation}, ${fish.fish_code}`, info, result, repeats > 1 ? `appears ${repeats} times` : null]
        .filter(Boolean)
        .join(', ')
    : `${relation} unknown`;
  return (
    <Pressable
      disabled={!fish}
      accessibilityRole={fish ? 'button' : 'text'}
      accessibilityLabel={label}
      onPress={() => fish && router.push({ pathname: '/fish/[id]', params: { id: fish.id } })}
      style={({ pressed }) => [
        styles.box,
        {
          backgroundColor: fish ? theme.backgroundElement : 'transparent',
          borderColor: repeats > 1 ? theme.accent : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text numberOfLines={1} style={[styles.code, { color: fish ? theme.text : theme.textSecondary }]}>
        {fish ? fish.fish_code : `${relation} unknown`}
        {repeats > 1 ? <Text style={{ color: theme.accent }}>{`  ×${repeats}`}</Text> : null}
      </Text>
      {info ? (
        <Text numberOfLines={1} style={[styles.detail, { color: theme.textSecondary }]}>
          {info}
        </Text>
      ) : null}
      {result ? (
        <Text numberOfLines={1} style={[styles.detail, { color: theme.accent }]}>
          {result}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function PedigreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { profile } = useAuth();
  const { fontScale } = useWindowDimensions();
  // Large text or a screen reader starts on the list, which wraps and reads in order.
  const [view, setView] = useState<PedigreeView>(fontScale >= 1.5 ? 'list' : 'tree');
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((on) => on && setView('list'));
  }, []);
  // Only the fish, the generations the tree shows and its littermates are fetched, with their results.
  const { data, error } = useFocusData(async () => {
    const self = await getFish(id);
    if (!self) return { fish: [] as Fish[], results: new Map<string, string>() };
    const [ancestors, siblings] = await Promise.all([listAncestors(self, PEDIGREE_DEPTH), listLittermates(self)]);
    const fish = [self, ...ancestors, ...siblings];
    const ids = fish.map((f) => f.id);
    const [scores, shows] = await Promise.all([listBestScores(ids), listShowEntriesForFish(ids)]);
    return { fish, results: resultsByFish(scores, shows) };
  });

  if (!data && !error) return <Loading />;
  const byId = Object.fromEntries((data?.fish ?? []).map((f) => [f.id, f]));
  const fish = byId[id];
  if (!fish) return <Screen><ErrorText message={error ?? 'This fish was not found in your account.'} /></Screen>;

  const columns = pedigreeColumns(fish, byId);
  const repeated = repeatedAncestors(columns);
  const repeats = new Map(repeated.map((r) => [r.fish.id, r.count]));
  // Boxes grow with the system text size so codes and scores aren't cut off.
  const scale = Math.max(1, fontScale);
  const slot = Math.ceil(SLOT * scale);
  const columnWidth = Math.round(COLUMN_WIDTH * Math.min(scale, 1.8));
  const height = columns[columns.length - 1].length * slot;
  const siblings = littermates(fish, data?.fish ?? []);

  return (
    <Screen>
      <Stack.Screen options={{ title: `${fish.fish_code} pedigree` }} />
      <Muted>Sires are on top, dams below, with each fish&apos;s best IHS score and placing. Tap a fish to open it.{view === 'tree' ? ' Scroll sideways for older generations.' : ''}</Muted>
      <SegmentedTabs options={VIEWS} value={view} onChange={setView} />

      {repeated.length > 0 ? (
        <Card>
          <Text style={[styles.code, { color: theme.text }]}>Ancestors that appear more than once</Text>
          {repeated.map((r) => (
            <Muted key={r.fish.id}>
              {r.fish.fish_code} appears {r.count} times
            </Muted>
          ))}
        </Card>
      ) : null}

      {view === 'tree' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tree}>
          {columns.map((column, g) => (
            <View key={g} style={[styles.column, { width: columnWidth }]}>
              <Muted style={styles.columnTitle}>{COLUMN_TITLES[g]}</Muted>
              <View style={[styles.slots, { height }]}>
                {column.map((f, i) => (
                  <View key={i} style={styles.slot}>
                    <Box
                      fish={f}
                      relation={relationLabel(g, i)}
                      repeats={f ? repeats.get(f.id) ?? 1 : 1}
                      result={f ? data?.results.get(f.id) : undefined}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        columns.slice(1).map((column, g) => (
          <View key={g} style={styles.generation}>
            <Muted style={styles.columnTitle}>{COLUMN_TITLES[g + 1]}</Muted>
            {column.map((f, i) => {
              const relation = relationLabel(g + 1, i);
              const count = f ? repeats.get(f.id) ?? 1 : 1;
              return f ? (
                <ListRow
                  key={i}
                  title={`${relation}: ${f.fish_code}${count > 1 ? `  ×${count}` : ''}`}
                  subtitle={[details(f), data?.results.get(f.id), count > 1 ? `Appears ${count} times` : null]
                    .filter(Boolean)
                    .join(' · ')}
                  onPress={() => router.push({ pathname: '/fish/[id]', params: { id: f.id } })}
                />
              ) : (
                <Muted key={i}>{relation} unknown</Muted>
              );
            })}
          </View>
        ))
      )}

      {siblings.length > 0 ? (
        <Card>
          <Text style={[styles.code, { color: theme.text }]}>Littermates</Text>
          {siblings.map((f) => (
            <Pressable key={f.id} onPress={() => router.push({ pathname: '/fish/[id]', params: { id: f.id } })}>
              <Muted>
                {[f.fish_code, labelOf(SEXES, f.sex), data?.results.get(f.id) ?? 'Not scored'].filter(Boolean).join(' · ')}
              </Muted>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Button
        title="Print pedigree certificate"
        icon={Icons.print}
        variant="secondary"
        busy={printing}
        onPress={async () => {
          setPrinting(true);
          try {
            const [evaluations, paths] = await Promise.all([listEvaluations(fish.id), latestPhotoPaths([fish.id])]);
            // The certificate still prints without the photo if it can't be fetched, e.g. offline.
            let photo: string | null = null;
            const path = paths[fish.id];
            if (path) {
              try {
                const url = (await signedPhotoUrls([path]))[path];
                if (url) photo = await imageDataUri(url);
              } catch {}
            }
            // Each official score's certificate photo gets a page of its own, oldest first.
            const official = evaluations
              .filter((e) => e.kind === 'official' && e.certificate_path)
              .sort((a, b) => a.evaluated_on.localeCompare(b.evaluated_on));
            const certificates: { image: string; caption: string }[] = [];
            if (official.length > 0) {
              const urls = await signedPhotoUrls(official.map((e) => e.certificate_path!));
              for (const e of official) {
                const url = urls[e.certificate_path!];
                if (!url) continue;
                const caption = [
                  e.event,
                  formatDate(e.evaluated_on),
                  `IHS ${e.total} / ${ihsMaxTotal(e.sex)}`,
                  e.placement,
                  e.judge ? `judged by ${e.judge}` : null,
                  e.locked_at ? `seal ${e.seal}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                // A certificate that can't be fetched is left out rather than stopping the print.
                try {
                  certificates.push({ image: await imageDataUri(url), caption });
                } catch {}
              }
            }
            await printHtml(
              certificateHtml(fish, data?.fish ?? [], profile, {
                photo,
                best: bestEvaluation(evaluations),
                results: data?.results,
                siblings,
                certificates,
              }),
            );
          } catch (e) {
            Alert.alert("Couldn't print", e instanceof Error ? e.message : String(e));
          } finally {
            setPrinting(false);
          }
        }}
      />
      <Muted>A one-page certificate with the fish&apos;s photo, best IHS score, three generations and littermates with their scores, and a page for each official certificate, to give a buyer or save as a PDF.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tree: { gap: Spacing.two, paddingBottom: Spacing.two },
  column: { gap: Spacing.one },
  generation: { gap: Spacing.two },
  columnTitle: { fontSize: 12 },
  slots: { justifyContent: 'space-around' },
  slot: { flex: 1, justifyContent: 'center' },
  box: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minHeight: 44, justifyContent: 'center' },
  code: { fontSize: 13, fontWeight: '600' },
  detail: { fontSize: 11 },
});
