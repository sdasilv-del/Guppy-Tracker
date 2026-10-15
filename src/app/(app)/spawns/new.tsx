import { router, useLocalSearchParams } from 'expo-router';

import { SpawnForm } from '@/components/spawn-form';
import { ErrorText, Loading, Screen } from '@/components/ui';
import { createSpawn, groupMembers, listFish, listGroups, listTanks } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function NewSpawnScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { data, error } = useFocusData(async () => {
    const [groups, members, fish, tanks] = await Promise.all([listGroups(), groupMembers(), listFish(), listTanks()]);
    return { groups, members, fish, tanks };
  });

  if (!data && !error) return <Loading />;
  if (!data) return <Screen><ErrorText message={error} /></Screen>;

  return (
    <Screen>
      <SpawnForm
        initialGroupId={groupId}
        groups={data.groups}
        membersByGroup={data.members}
        allFish={data.fish}
        tanks={data.tanks}
        submitLabel="Save spawn"
        onSubmit={async (input) => {
          const spawn = await createSpawn(input);
          router.replace({ pathname: '/spawns/[id]', params: { id: spawn.id } });
        }}
      />
    </Screen>
  );
}
