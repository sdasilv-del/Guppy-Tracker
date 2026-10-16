import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ChipSelect, Empty, ErrorText, Field, Loading, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { FISH_STATUSES, INACTIVE_STATUSES, labelOf, SEXES } from '@/lib/constants';
import { latestPhotoPaths, listFish, listTanks, signedPhotoUrls } from '@/lib/db';
import { formatAge } from '@/lib/format';
import { useFocusData } from '@/lib/use-data';
import { useTheme } from '@/hooks/use-theme';

const FILTERS = [
  { value: 'active', label: 'In the fish room' },
  { value: 'all', label: 'All' },
  ...FISH_STATUSES,
] as const;

type Filter = (typeof FILTERS)[number]['value'];

export default function FishListScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const { data, error } = useFocusData(async () => {
    const [fish, tanks] = await Promise.all([listFish(), listTanks()]);
    const paths = await latestPhotoPaths(fish.map((f) => f.id));
    const urls = await signedPhotoUrls(Object.values(paths));
    const thumbs: Record<string, string> = {};
    for (const [fishId, path] of Object.entries(paths)) if (urls[path]) thumbs[fishId] = urls[path];
    return { fish, thumbs, tankNames: Object.fromEntries(tanks.map((t) => [t.id, t.tank_code])) };
  });

  const shown = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.fish.filter((f) => {
      if (filter === 'active' && INACTIVE_STATUSES.includes(f.status)) return false;
      if (filter !== 'active' && filter !== 'all' && f.status !== filter) return false;
      if (!q) return true;
      return [f.fish_code, f.name, f.strain, ...f.previous_codes].some((s) => s?.toLowerCase().includes(q));
    });
  }, [data, query, filter]);

  if (!data && !error) return <Loading />;

  return (
    <Screen>
      <Button title="Add a fish" onPress={() => router.push('/fish/new')} />
      <ErrorText message={error} />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="ID, name or strain" autoCapitalize="none" />
      <ChipSelect label="Show" options={FILTERS} value={filter} onChange={(v) => v && setFilter(v)} />
      {shown.length === 0 ? (
        <Empty>{data?.fish.length ? 'No fish match.' : 'No fish yet. Add your first fish.'}</Empty>
      ) : null}
      {shown.map((f) => (
        <Pressable
          key={f.id}
          onPress={() => router.push({ pathname: '/fish/[id]', params: { id: f.id } })}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 },
          ]}>
          {data?.thumbs[f.id] ? (
            <Image source={{ uri: data.thumbs[f.id] }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>{f.fish_code}</Text>
            <Text style={{ color: theme.textSecondary }}>
              {[f.name, f.strain, labelOf(SEXES, f.sex), formatAge(f.date_of_birth)].filter(Boolean).join(' · ')}
            </Text>
            <Text style={{ color: theme.textSecondary }}>
              {[labelOf(FISH_STATUSES, f.status), f.tank_id ? data?.tankNames[f.tank_id] : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two + 4, borderRadius: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: '600' },
});
