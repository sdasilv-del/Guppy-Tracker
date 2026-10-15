import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { labelOf, TAIL_STANDARDS } from '@/lib/constants';
import { listFish } from '@/lib/db';
import { pedigreeColumns, repeatedAncestors } from '@/lib/pedigree';
import type { Fish } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';
import { useTheme } from '@/hooks/use-theme';

const COLUMN_TITLES = ['Fish', 'Parents', 'Grandparents', 'Great-grandparents', 'Great-great-grandparents'];
const SLOT = 52;

function Box({ fish, role, highlight }: { fish: Fish | null; role: string; highlight: boolean }) {
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
    </Pressable>
  );
}

export default function PedigreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data, error } = useFocusData(listFish);

  if (!data && !error) return <Loading />;
  const byId = Object.fromEntries((data ?? []).map((f) => [f.id, f]));
  const fish = byId[id];
  if (!fish) return <Screen><ErrorText message={error ?? 'This fish was not found in your account.'} /></Screen>;

  const columns = pedigreeColumns(fish, byId);
  const repeated = repeatedAncestors(columns);
  const repeatedIds = new Set(repeated.map((r) => r.fish.id));
  const height = columns[columns.length - 1].length * SLOT;

  return (
    <Screen>
      <Stack.Screen options={{ title: `${fish.fish_code} pedigree` }} />
      <Muted>Sires are on top, dams below. Tap a fish to open it. Scroll sideways for older generations.</Muted>

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
                  <Box fish={f} role={g === 0 ? '' : i % 2 === 0 ? 'Sire' : 'Dam'} highlight={!!f && repeatedIds.has(f.id)} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
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
