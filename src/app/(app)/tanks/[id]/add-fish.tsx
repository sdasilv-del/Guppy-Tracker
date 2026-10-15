import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FishPicker } from '@/components/fish-picker';
import { Button, ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { INACTIVE_STATUSES } from '@/lib/constants';
import { getTank, listFish, listTanks, moveFish } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function AddFishToTankScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useFocusData(async () => {
    const [tank, fish, tanks] = await Promise.all([getTank(id), listFish(), listTanks()]);
    return {
      tank,
      fish: fish.filter((f) => f.tank_id !== id && !INACTIVE_STATUSES.includes(f.status)),
      tankNames: Object.fromEntries(tanks.map((t) => [t.id, t.tank_code])),
    };
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!data && !error) return <Loading />;
  if (!data?.tank) return <Screen><ErrorText message={error ?? 'Tank not found.'} /></Screen>;

  async function move() {
    setBusy(true);
    setSaveError(null);
    try {
      await moveFish(selected, id);
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `Move fish to ${data.tank.tank_code}` }} />
      {data.tank.purpose === 'cull' ? (
        <Muted>This is a cull tank. Fish moved here are marked Culled.</Muted>
      ) : null}
      <Button
        title={selected.length ? `Move ${selected.length} fish here` : 'Select fish to move'}
        onPress={move}
        disabled={selected.length === 0}
        busy={busy}
      />
      <ErrorText message={saveError} />
      <FishPicker
        fish={data.fish}
        selected={selected}
        tankNames={data.tankNames}
        onToggle={(fid) =>
          setSelected((s) => (s.includes(fid) ? s.filter((x) => x !== fid) : [...s, fid]))
        }
        emptyText="No other fish to move."
      />
    </Screen>
  );
}
