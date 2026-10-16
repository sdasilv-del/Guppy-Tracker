import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { FishForm } from '@/components/fish-form';
import { Button, ErrorText, Loading, Screen } from '@/components/ui';
import { deleteFish, listFish, listTanks, updateFish } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';
import { attempt } from '@/lib/alerts';

export default function EditFishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useFocusData(async () => {
    const [fish, tanks] = await Promise.all([listFish(), listTanks()]);
    return { fish, tanks, current: fish.find((f) => f.id === id) ?? null };
  });

  if (!data && !error) return <Loading />;
  if (!data?.current) return <Screen><ErrorText message={error ?? 'Fish not found.'} /></Screen>;
  const current = data.current;

  function confirmDelete() {
    Alert.alert(
      `Delete ${current.fish_code}?`,
      'This removes the fish, its photos and move history. To keep its record, set its status to Deceased, Culled or Sold instead.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => attempt(() => deleteFish(id), () => router.dismissTo('/fish')),
        },
      ],
    );
  }

  return (
    <Screen>
      <FishForm
        initial={current}
        allFish={data.fish}
        tanks={data.tanks}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          await updateFish(id, input);
          router.back();
        }}
      />
      <Button title="Delete fish" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}
