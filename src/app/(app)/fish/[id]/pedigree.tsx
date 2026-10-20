import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { labelOf, TAIL_STANDARDS } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { latestPhotoPaths, listAllShowEntries, listEvaluationSummaries, listEvaluations, listFish, signedPhotoUrls } from '@/lib/db';
import { bestEvaluation, certificateHtml } from '@/lib/export';
import { pedigreeColumns, repeatedAncestors } from '@/lib/pedigree';
import { bestPlacings, bestScores, scoreLabel } from '@/lib/scores';
import { imageDataUri, printHtml } from '@/lib/share';
import type { Fish } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';
import { useTheme } from '@/hooks/use-theme';

const COLUMN_TITLES = ['Fish', 'Parents', 'Grandparents', 'Great-grandparents', 'Great-great-grandparents'];
const SLOT = 64;

function Box({ fish, role, highlight, result }: { fish: Fish | null; role: string; highlight: boolean; result?: string }) {
  const theme = useTheme();
  const tail = fish ? labelOf(TAIL_STANDARDS, fish.tail_standard).split(' ').slice(1).join(' ') : '';
  return (
    <Pressable
      disabled={!fish}
      onPress={() => fish && router.push({ pathname: '/fish/[id]', params: { id: fish.id } })}
      style={({ pressed }) => [
        styles.box,
        {
          backgroundColor: fish ? theme.backgroundElement : 'transparent',
          borderColor: highlight ? theme.accent : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text numberOfLines={1} style={[styles.code, { color: fish ? theme.text : theme.textSecondary }]}>
        {fish ? fish.fish_code : `${role} unknown`}
      </Text>
      {fish ? (
        <Text numberOfLines={1} style={[styles.detail, { color: theme.textSecondary }]}>
          {[fish.strain, fish.generation, tail].filter(Boolean).join(' · ')}
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
  const [printing, setPrinting] = useState(false);
  const { data, error } = useFocusData(async () => {
    const [fish, scores, shows] = await Promise.all([listFish(), listEvaluationSummaries(), listAllShowEntries()]);
    const best = bestScores(scores);
    const placings = bestPlacings(shows);
    // Each ancestor's best score and placing, e.g. "IHS 86.5 / 100 · 1st, Trans Canada".
    const results = new Map<string, string>();
    for (const f of fish) {
      const score = best.get(f.id);
      const text = [score ? `IHS ${scoreLabel(score)}` : null, placings.get(f.id)].filter(Boolean).join(' · ');
      if (text) results.set(f.id, text);
    }
    return { fish, results };
  });

  if (!data && !error) return <Loading />;
  const byId = Object.fromEntries((data?.fish ?? []).map((f) => [f.id, f]));
  const fish = byId[id];
  if (!fish) return <Screen><ErrorText message={error ?? 'This fish was not found in your account.'} /></Screen>;

  const columns = pedigreeColumns(fish, byId);
  const repeated = repeatedAncestors(columns);
  const repeatedIds = new Set(repeated.map((r) => r.fish.id));
  const height = columns[columns.length - 1].length * SLOT;

  return (
    <Screen>
      <Stack.Screen options={{ title: `${fish.fish_code} pedigree` }} />
      <Muted>Sires are on top, dams below, with each fish&apos;s best IHS score and placing. Tap a fish to open it. Scroll sideways for older generations.</Muted>

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

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tree}>
        {columns.map((column, g) => (
          <View key={g} style={styles.column}>
            <Muted style={styles.columnTitle}>{COLUMN_TITLES[g]}</Muted>
            <View style={[styles.slots, { height }]}>
              {column.map((f, i) => (
                <View key={i} style={styles.slot}>
                  <Box
                    fish={f}
                    role={g === 0 ? '' : i % 2 === 0 ? 'Sire' : 'Dam'}
                    highlight={!!f && repeatedIds.has(f.id)}
                    result={f ? data?.results.get(f.id) : undefined}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

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
            await printHtml(
              certificateHtml(fish, data?.fish ?? [], profile, {
                photo,
                best: bestEvaluation(evaluations),
                results: data?.results,
              }),
            );
          } catch (e) {
            Alert.alert("Couldn't print", e instanceof Error ? e.message : String(e));
          } finally {
            setPrinting(false);
          }
        }}
      />
      <Muted>A one-page certificate with the fish&apos;s photo, best IHS score and three generations with their scores, to give a buyer or save as a PDF.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tree: { gap: Spacing.two, paddingBottom: Spacing.two },
  column: { width: 150, gap: Spacing.one },
  columnTitle: { fontSize: 12 },
  slots: { justifyContent: 'space-around' },
  slot: { flex: 1, justifyContent: 'center' },
  box: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minHeight: 44, justifyContent: 'center' },
  code: { fontSize: 13, fontWeight: '600' },
  detail: { fontSize: 11 },
});
