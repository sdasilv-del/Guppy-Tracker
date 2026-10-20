import { router } from 'expo-router';

import { Button, Empty, ErrorText, ListRow, ListScreen, Loading, Muted } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { labelOf, TANK_PURPOSES } from '@/lib/constants';
import { fishCountsByTank, listTanks } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function TanksScreen() {
  const { data, error, reload } = useFocusData(async () => {
    const [tanks, counts] = await Promise.all([listTanks(), fishCountsByTank()]);
    return { tanks, counts };
  });

  if (!data && !error) return <Loading />;

  return (
    <ListScreen
      header={
        <>
          <Button title="Add a tank" icon={Icons.add} onPress={() => router.push('/tanks/new')} />
          <ErrorText message={error} />
        </>
      }
      data={data?.tanks ?? []}
      keyExtractor={(t) => t.id}
      onRefresh={reload}
      empty={data ? <Empty>No tanks yet. Add your first tank to get its QR code.</Empty> : null}
      renderItem={({ item: t }) => (
        <ListRow
          icon={Icons.tank}
          title={t.name ? `${t.tank_code} · ${t.name}` : t.tank_code}
          subtitle={[
            labelOf(TANK_PURPOSES, t.purpose),
            t.size_gallons ? `${t.size_gallons} gal` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          right={<Muted>{data?.counts[t.id] ?? 0} fish</Muted>}
          onPress={() => router.push({ pathname: '/tanks/[id]', params: { id: t.id } })}
        />
      )}
    />
  );
}
