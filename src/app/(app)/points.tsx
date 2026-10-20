import { router } from 'expo-router';
import { useState } from 'react';

import { ChipSelect, Empty, ErrorText, ListRow, Loading, Muted, Screen, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { listAllShowEntries, listFish } from '@/lib/db';
import { pointsTables, seasons } from '@/lib/points';
import { useFocusData } from '@/lib/use-data';

// Season points per show class, worked out from the show entries on each fish.
export default function PointsScreen() {
  const { data, error } = useFocusData(async () => {
    const [entries, fish] = await Promise.all([listAllShowEntries(), listFish()]);
    return { entries, fish };
  });
  const [picked, setPicked] = useState<number | null>(null);

  if (!data && !error) return <Loading />;
  if (!data) return <Screen><ErrorText message={error} /></Screen>;

  const years = seasons(data.entries);
  const season = picked ?? years[0] ?? null;
  const tables = season ? pointsTables(data.entries, data.fish, season) : [];
  const anyEstimated = tables.some((t) => t.standings.some((s) => s.estimated));

  return (
    <Screen>
      {years.length === 0 ? (
        <Empty>No show entries yet. Add show results on each fish and the season tables build themselves.</Empty>
      ) : (
        <ChipSelect
          label="Season"
          options={years.map((y) => ({ value: y, label: String(y) }))}
          value={season}
          onChange={(v) => v && setPicked(v)}
        />
      )}
      {anyEstimated ? (
        <Muted>Entries without points count by placing: 1st 10, 2nd 8, 3rd 6, 4th 4, 5th 2. Marked with *.</Muted>
      ) : null}
      {tables.map((t) => (
        <Section key={t.name} title={t.name}>
          {t.standings.map((s, i) => (
            <ListRow
              key={s.fishId}
              icon={i === 0 ? Icons.show : Icons.fish}
              title={`${i + 1}. ${s.fish?.fish_code ?? 'Deleted fish'} · ${s.points} pts${s.estimated ? ' *' : ''}`}
              subtitle={[
                s.fish?.name,
                `${s.entries} ${s.entries === 1 ? 'show' : 'shows'}`,
                s.wins ? `${s.wins} ${s.wins === 1 ? 'win' : 'wins'}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={s.fish ? () => router.push({ pathname: '/fish/[id]', params: { id: s.fishId } }) : undefined}
            />
          ))}
        </Section>
      ))}
    </Screen>
  );
}
