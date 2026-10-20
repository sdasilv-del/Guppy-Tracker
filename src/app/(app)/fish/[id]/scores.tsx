import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Empty, ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { EVALUATION_KINDS, ihsCategories, ihsMaxTotal, labelOf } from '@/lib/constants';
import { getFish, listEvaluations, signedPhotoUrls } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { isDisqualified } from '@/lib/ihs-reasons';
import { scoreHistorySummary } from '@/lib/scores';
import type { Evaluation } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';
import { useTheme } from '@/hooks/use-theme';

// Points per body part (males) or per category (females), so changes between judgings show where they came from.
function breakdown(e: Evaluation): { label: string; points: number; max: number }[] {
  const categories = ihsCategories(e.sex);
  const groups = e.sex === 'M' ? [...new Set(categories.map((c) => c.part))] : categories.map((c) => c.label);
  return groups.map((label) => {
    const inGroup = categories.filter((c) => (e.sex === 'M' ? c.part : c.label) === label);
    const points = inGroup.reduce((sum, c) => sum + (e.scores[c.key] ?? 0), 0);
    return { label, points: Math.round(points * 10) / 10, max: inGroup.reduce((sum, c) => sum + c.max, 0) };
  });
}

// Every IHS score this fish has had, oldest to newest, each with the photo taken that day.
export default function ScoreHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data, error } = useFocusData(async () => {
    const [fish, evaluations] = await Promise.all([getFish(id), listEvaluations(id)]);
    const urls = await signedPhotoUrls(evaluations.map((e) => e.photo_path).filter((p): p is string => !!p));
    return { fish, evaluations: [...evaluations].reverse(), urls };
  });

  if (!data && !error) return <Loading />;
  if (!data?.fish) return <Screen><ErrorText message={error ?? 'Fish not found.'} /></Screen>;
  const { evaluations, urls } = data;
  const best = Math.max(0, ...evaluations.map((e) => e.total / ihsMaxTotal(e.sex)));

  return (
    <Screen>
      <Stack.Screen options={{ title: `${data.fish.fish_code} scores` }} />
      {evaluations.length === 0 ? <Empty>No evaluations yet.</Empty> : null}
      {evaluations.length > 1 ? (
        <Card>
          <Muted>Total score at each judging, oldest on the left{evaluations.length > 12 ? ' (latest 12)' : ''}</Muted>
          <View
            style={styles.chart}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Score history chart. ${scoreHistorySummary(evaluations, formatDate)}`}>
            {evaluations.slice(-12).map((e) => {
              const share = e.total / ihsMaxTotal(e.sex);
              return (
                <View key={e.id} style={styles.barColumn}>
                  <Text style={[styles.barValue, { color: theme.text }]}>{e.total}</Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, share * 120),
                        backgroundColor: share === best ? theme.accent : theme.backgroundSelected,
                      },
                    ]}
                  />
                  <Text style={[styles.barDate, { color: theme.textSecondary }]} numberOfLines={1}>
                    {formatDate(e.evaluated_on).replace(/,? \d{4}$/, '')}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}
      {[...evaluations].reverse().map((e, i, list) => {
        const before = list[i + 1];
        const previous = before && before.sex === e.sex ? breakdown(before) : null;
        return (
          <Pressable
            key={e.id}
            onPress={() => router.push({ pathname: '/fish/[id]/evaluation', params: { id, evalId: e.id } })}>
            <Card>
              {e.photo_path && urls[e.photo_path] ? (
                <Image source={{ uri: urls[e.photo_path] }} style={styles.photo} contentFit="cover" />
              ) : (
                <Muted>No photo with this score. Add one from the evaluation so it can be checked later.</Muted>
              )}
              <Text style={[styles.total, { color: theme.text }]}>
                {e.total} / {ihsMaxTotal(e.sex)}
                {isDisqualified(e.sex, e.score_reasons ?? {}) ? ' · Disqualified' : ''}
              </Text>
              <Muted>
                {[
                  formatDate(e.evaluated_on),
                  labelOf(EVALUATION_KINDS, e.kind),
                  e.judge,
                  e.event,
                  `IHS ${e.standard_year}`,
                  e.locked_at ? `Signed, seal ${e.seal}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Muted>
              {breakdown(e).map((part, j) => {
                const change = previous ? Math.round((part.points - previous[j].points) * 10) / 10 : 0;
                return (
                  <View key={part.label} style={styles.partRow}>
                    <Text style={[styles.partLabel, { color: theme.text }]}>{part.label}</Text>
                    <Text style={{ color: theme.text }}>
                      {part.points} / {part.max}
                    </Text>
                    <Text
                      style={[
                        styles.change,
                        { color: change > 0 ? theme.success : change < 0 ? theme.danger : theme.textSecondary },
                      ]}>
                      {previous && change !== 0 ? `${change > 0 ? '+' : ''}${change}` : ''}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, minHeight: 170, paddingTop: Spacing.two },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  bar: { width: '70%', borderRadius: 4 },
  barValue: { fontSize: 12, fontWeight: '600' },
  barDate: { fontSize: 10 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10 },
  total: { fontSize: 22, fontWeight: '700' },
  partRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  partLabel: { flex: 1 },
  change: { width: 44, textAlign: 'right', fontWeight: '600' },
});
