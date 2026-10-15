import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorText, ListRow, Loading, Muted, Screen } from '@/components/ui';
import { labelOf, TANK_PURPOSES } from '@/lib/constants';
import { getFish, listTanks, moveFish } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function MoveFishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useFocusData(async () => {
    const [fish, tanks] = await Promise.all([getFish(id), listTanks()]);
    return { fish, tanks };
  });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!data && !error) return <Loading />;
  if (!data?.fish) return <Screen><ErrorText message={error ?? 'Fish not found.'} /></Screen>;
  const fish = data.fish;

  async function moveTo(tankId: string | null) {
    setBusy(true);
    setSaveError(null);
    try {
      await moveFish([id], tankId);
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `Move ${fish.fish_code}` }} />
      <Muted>Tap the tank to move this fish to. Moving into a cull tank marks it Culled.</Muted>
      <ErrorText message={saveError} />
      {data.tanks
        .filter((t) => t.id !== fish.tank_id)
        .map((t) => (
          <ListRow
            key={t.id}
            title={t.name ? `${t.tank_code} · ${t.name}` : t.tank_code}
            subtitle={labelOf(TANK_PURPOSES, t.purpose)}
            onPress={busy ? undefined : () => moveTo(t.id)}
          />
        ))}
      {fish.tank_id ? (
        <Button title="Take out of any tank" variant="secondary" onPress={() => moveTo(null)} busy={busy} />
      ) : null}
    </Screen>
  );
}
