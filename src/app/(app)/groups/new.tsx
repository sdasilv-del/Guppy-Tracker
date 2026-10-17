import { router, useLocalSearchParams } from 'expo-router';

import { GroupForm } from '@/components/group-form';
import { ErrorText, Loading, Screen } from '@/components/ui';
import { createGroup, listFish, listTanks, listTraits, moveFish, setGroupMembers, setGroupTraits } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function NewGroupScreen() {
  // Trial pairing passes the chosen pair, comma separated.
  const { members } = useLocalSearchParams<{ members?: string }>();
  const { data, error } = useFocusData(async () => {
    const [fish, tanks, traits] = await Promise.all([listFish(), listTanks(), listTraits()]);
    return { fish, tanks, traits };
  });

  if (!data && !error) return <Loading />;
  if (!data) return <Screen><ErrorText message={error} /></Screen>;

  return (
    <Screen>
      <GroupForm
        allFish={data.fish}
        initialMemberIds={members ? members.split(',') : []}
        tanks={data.tanks}
        traits={data.traits}
        submitLabel="Create group"
        onSubmit={async ({ input, memberIds, traitIds, moveIntoTank }) => {
          const group = await createGroup(input);
          await Promise.all([setGroupMembers(group.id, memberIds), setGroupTraits(group.id, traitIds)]);
          if (moveIntoTank && input.tank_id) {
            const away = data.fish.filter((f) => memberIds.includes(f.id) && f.tank_id !== input.tank_id);
            await moveFish(away.map((f) => f.id), input.tank_id);
          }
          router.replace({ pathname: '/groups/[id]', params: { id: group.id } });
        }}
      />
    </Screen>
  );
}
