import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { SpawnForm } from '@/components/spawn-form';
import { Button, ErrorText, Loading, Screen } from '@/components/ui';
import { deleteSpawn, getSpawn, groupMembers, listFish, listGroups, listTanks, updateSpawn } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function EditSpawnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useFocusData(async () => {
    const [spawn, groups, members, fish, tanks] = await Promise.all([
      getSpawn(id),
      listGroups(),
      groupMembers(),
      listFish(),
      listTanks(),
    ]);
    return { spawn, groups, members, fish, tanks };
  });

  if (!data && !error) return <Loading />;
  if (!data?.spawn) return <Screen><ErrorText message={error ?? 'Spawn not found.'} /></Screen>;
  const spawn = data.spawn;

  function confirmDelete() {
    Alert.alert(
      `Delete ${spawn.spawn_code}?`,
      'This removes the spawn and its log. Fish picked from it are kept, without the link back to this spawn.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSpawn(id);
            router.dismissTo('/spawns');
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <SpawnForm
        initial={spawn}
        groups={data.groups}
        membersByGroup={data.members}
        allFish={data.fish}
        tanks={data.tanks}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          await updateSpawn(id, input);
          router.back();
        }}
      />
      <Button title="Delete spawn" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}
