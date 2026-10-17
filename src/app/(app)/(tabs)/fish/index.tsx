import { Image } from 'expo-image';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ChipSelect, Empty, ErrorText, Field, Loading, Muted, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { FISH_STATUSES, INACTIVE_STATUSES, labelOf, SEXES, type Sex, TAIL_STANDARDS, type TailStandard } from '@/lib/constants';
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

type Filters = {
  status: Filter;
  sex: Sex | null;
  tail: TailStandard | null;
  strain: string | null;
  tank: string | null;
};

const NO_FILTERS: Filters = { status: 'active', sex: null, tail: null, strain: null, tank: null };

// The last filters used are kept on this phone, so the list opens the way you left it.
const FILTERS_KEY = 'gt-fish-filters';

export default function FishListScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [showMore, setShowMore] = useState(false);
  const set = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    AsyncStorage.setItem(FILTERS_KEY, JSON.stringify(next)).catch(() => {});
  };

  useEffect(() => {
    AsyncStorage.getItem(FILTERS_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = { ...NO_FILTERS, ...JSON.parse(saved) } as Filters;
        setFilters(parsed);
        if (parsed.sex || parsed.tail || parsed.strain || parsed.tank) setShowMore(true);
      })
      .catch(() => {});
  }, []);
  const { data, error } = useFocusData(async () => {
    const [fish, tanks] = await Promise.all([listFish(), listTanks()]);
    const paths = await latestPhotoPaths(fish.map((f) => f.id));
    const urls = await signedPhotoUrls(Object.values(paths));
    const thumbs: Record<string, string> = {};
    for (const [fishId, path] of Object.entries(paths)) if (urls[path]) thumbs[fishId] = urls[path];
    return {
      fish,
      thumbs,
      tankNames: Object.fromEntries(tanks.map((t) => [t.id, t.tank_code])),
      tankOptions: tanks.map((t) => ({ value: t.id, label: t.name ? `${t.tank_code} ${t.name}` : t.tank_code })),
      strainOptions: [...new Set(fish.map((f) => f.strain?.trim()).filter((s): s is string => !!s))]
        .sort((a, b) => a.localeCompare(b))
        .map((s) => ({ value: s, label: s })),
    };
  });

  const shown = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const { status, sex, tail, strain, tank } = filters;
    return data.fish.filter((f) => {
      if (status === 'active' && INACTIVE_STATUSES.includes(f.status)) return false;
      if (status !== 'active' && status !== 'all' && f.status !== status) return false;
      if (sex && f.sex !== sex) return false;
      if (tail && f.tail_standard !== tail) return false;
      if (strain && f.strain?.trim() !== strain) return false;
      if (tank && f.tank_id !== tank) return false;
      if (!q) return true;
      return [f.fish_code, f.name, f.strain, ...f.previous_codes].some((s) => s?.toLowerCase().includes(q));
    });
  }, [data, query, filters]);

  const moreCount = [filters.sex, filters.tail, filters.strain, filters.tank].filter(Boolean).length;

  if (!data && !error) return <Loading />;

  return (
    <Screen>
      <Button title="Add a fish" icon={Icons.add} onPress={() => router.push('/fish/new')} />
      <ErrorText message={error} />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="ID, name or strain" autoCapitalize="none" />
      <ChipSelect label="Show" options={FILTERS} value={filters.status} onChange={(v) => v && set({ status: v })} />
      <Button
        title={showMore ? 'Hide filters' : moreCount ? `More filters (${moreCount} on)` : 'More filters'}
        icon={Icons.filter}
        variant="secondary"
        small
        onPress={() => setShowMore(!showMore)}
      />
      {showMore ? (
        <>
          <ChipSelect label="Sex" options={SEXES} value={filters.sex} onChange={(v) => set({ sex: v })} allowClear />
          <ChipSelect label="Tail" options={TAIL_STANDARDS} value={filters.tail} onChange={(v) => set({ tail: v })} allowClear />
          {data?.strainOptions.length ? (
            <ChipSelect label="Strain" options={data.strainOptions} value={filters.strain} onChange={(v) => set({ strain: v })} allowClear />
          ) : null}
          {data?.tankOptions.length ? (
            <ChipSelect label="Tank" options={data.tankOptions} value={filters.tank} onChange={(v) => set({ tank: v })} allowClear />
          ) : null}
          {moreCount ? (
            <Button
              title="Clear filters"
              variant="secondary"
              small
              onPress={() => set({ sex: null, tail: null, strain: null, tank: null })}
            />
          ) : null}
        </>
      ) : null}
      {data ? <Muted>{`${shown.length} fish shown`}</Muted> : null}
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
