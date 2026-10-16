import { router } from 'expo-router';

import { Button, Empty, ErrorText, ListRow, Loading, Muted, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { labelOf, TANK_PURPOSES } from '@/lib/constants';
import { fishCountsByTank, listTanks } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function TanksScreen() {
  const { data, error } = useFocusData(async () => {
    const [tanks, counts] = await Promise.all([listTanks(), fishCountsByTank()]);
    return { tanks, counts };
  });

  if (!data && !error) return <Loading />;

  return (
    <Screen>
      <Button title="Add a tank" icon={Icons.add} onPress={() => router.push('/tanks/new')} />
      <ErrorText message={error} />
      {data?.tanks.length === 0 ? (
        <Empty>No tanks yet. Add your first tank to get its QR code.</Empty>
      ) : null}
      {data?.tanks.map((t) => (
        <ListRow
            icon={Icons.tank}
          key={t.id}
          title={t.name ? `${t.tank_code} · ${t.name}` : t.tank_code}
          subtitle={[
            labelOf(TANK_PURPOSES, t.purpose),
            t.size_gallons ? `${t.size_gallons} gal` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          right={<Muted>{data.counts[t.id] ?? 0} fish</Muted>}
          onPress={() => router.push({ pathname: '/tanks/[id]', params: { id: t.id } })}
        />
      ))}
    </Screen>
  );
}
